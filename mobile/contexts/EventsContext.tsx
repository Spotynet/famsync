/**
 * EventsContext — in-memory event store persisted to AsyncStorage.
 * Provides CRUD operations for CalEvent without needing a backend.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { CalEvent, getSeedEvents } from '../lib/mockData';

const STORAGE_KEY = 'famsync_events_v1';

// ─── Context shape ────────────────────────────────────────────────────────────

type EventsContextType = {
  events: CalEvent[];
  isLoading: boolean;
  addEvent: (event: Omit<CalEvent, 'id'>) => Promise<CalEvent>;
  updateEvent: (id: string, patch: Partial<CalEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsForDate: (date: string) => CalEvent[];
};

const EventsContext = createContext<EventsContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents]     = useState<CalEvent[]>([]);
  const [isLoading, setLoading] = useState(true);

  // Load from storage (or seed) on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed: CalEvent[] = JSON.parse(raw);
            setEvents(parsed);
            return;
          } catch {
            // corrupted — fall through to seed
          }
        }
        // First run: seed with mock events
        const seed = getSeedEvents();
        setEvents(seed);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      })
      .finally(() => setLoading(false));
  }, []);

  // Persist to storage whenever events change
  const persist = useCallback((next: CalEvent[]) => {
    setEvents(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addEvent = useCallback(
    async (data: Omit<CalEvent, 'id'>): Promise<CalEvent> => {
      const event: CalEvent = { ...data, id: `evt_${Date.now()}` };
      persist([...events, event]);
      return event;
    },
    [events, persist]
  );

  const updateEvent = useCallback(
    async (id: string, patch: Partial<CalEvent>) => {
      persist(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [events, persist]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      persist(events.filter((e) => e.id !== id));
    },
    [events, persist]
  );

  const getEventsForDate = useCallback(
    (date: string): CalEvent[] =>
      events
        .filter((e) => e.date === date)
        .sort((a, b) => {
          if (a.allDay && !b.allDay) return -1;
          if (!a.allDay && b.allDay) return 1;
          return a.startTime.localeCompare(b.startTime);
        }),
    [events]
  );

  return (
    <EventsContext.Provider
      value={{ events, isLoading, addEvent, updateEvent, deleteEvent, getEventsForDate }}
    >
      {children}
    </EventsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used inside EventsProvider');
  return ctx;
}
