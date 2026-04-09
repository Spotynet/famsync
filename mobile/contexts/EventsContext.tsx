/**
 * Events from the API: family-scoped events (includes items synced from Google Calendar).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from './AuthContext';
import { USE_MOCK_AUTH } from '../lib/constants';
import {
  createFamilyEvent,
  createFamily,
  deleteFamily,
  deleteFamilyEvent,
  fetchFamilies,
  fetchFamilyMembers,
  fetchFamilyCategories,
  fetchFamilyEvents,
  joinFamily,
  mapApiEventToCalEvent,
  mapCategory,
  mapMember,
  regenerateFamilyInvite,
  removeFamilyMember,
  updateFamilyEvent,
  updateFamily,
  updateFamilyMember,
  leaveFamily,
  type ApiFamilyMemberRow,
  type ApiFamilyRow,
} from '../lib/eventsApi';
import type { CalEvent, Category, Member } from '../lib/mockData';
import { MEMBERS as FALLBACK_MEMBERS } from '../lib/mockData';
import { offsetDate } from '../lib/mockData';

type EventsContextType = {
  families: ApiFamilyRow[];
  currentFamily: ApiFamilyRow | null;
  events: CalEvent[];
  members: Member[];
  categories: Category[];
  /** Default DB category id for new events (first match or lowest id) */
  defaultCategoryId: number | null;
  familyId: number | null;
  currentMembershipId: number | null;
  isCurrentFamilyAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  refreshEvents: () => Promise<void>;
  refreshFamilies: () => Promise<void>;
  selectFamily: (nextFamilyId: number) => Promise<void>;
  createGroup: (family: { name: string; description?: string; color?: string }) => Promise<void>;
  updateGroup: (family: { name?: string; description?: string; color?: string }) => Promise<void>;
  deleteCurrentGroup: () => Promise<void>;
  joinGroup: (inviteCode: string) => Promise<void>;
  regenerateInviteCode: () => Promise<string>;
  updateGroupMember: (
    memberId: number,
    patch: { role?: 'admin' | 'member'; display_name?: string; color?: string; initials?: string }
  ) => Promise<void>;
  removeGroupMember: (memberId: number) => Promise<void>;
  leaveCurrentGroup: () => Promise<void>;
  addEvent: (event: Omit<CalEvent, 'id' | 'googleEventId'>) => Promise<CalEvent>;
  updateEvent: (id: string, patch: Partial<CalEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsForDate: (date: string) => CalEvent[];
};

const EventsContext = createContext<EventsContextType | null>(null);

function dateRangeWindow(): { date_from: string; date_to: string } {
  return {
    date_from: offsetDate(-45),
    date_to: offsetDate(120),
  };
}

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [families, setFamilies] = useState<ApiFamilyRow[]>([]);
  const [currentFamily, setCurrentFamily] = useState<ApiFamilyRow | null>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [members, setMembers] = useState<Member[]>(FALLBACK_MEMBERS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultCategoryId = useMemo(() => {
    if (categories.length === 0) return null;
    const fam = categories.find((c) => c.label === 'Familia');
    if (fam) return Number(fam.id);
    return Number(categories[0].id);
  }, [categories]);

  const isCurrentFamilyAdmin = useMemo(() => {
    if (!currentFamily || !user) return false;
    return (currentFamily.members ?? []).some(
      (member) => member.user_id === user.id && member.role === 'admin'
    );
  }, [currentFamily, user]);

  const currentMembershipId = useMemo(() => {
    if (!currentFamily || !user) return null;
    return currentFamily.members?.find((member) => member.user_id === user.id)?.id ?? null;
  }, [currentFamily, user]);

  const loadSelectedFamily = useCallback(async (list: ApiFamilyRow[], preferredFamilyId?: number | null) => {
    const resolvedFamilyId =
      preferredFamilyId && list.some((family) => family.id === preferredFamilyId)
        ? preferredFamilyId
        : list[0]?.id ?? null;

    setFamilyId(resolvedFamilyId);

    if (resolvedFamilyId == null) {
      setCurrentFamily(null);
      setMembers([]);
      setCategories([]);
      setEvents([]);
      return;
    }

    const familyFromList = list.find((family) => family.id === resolvedFamilyId) ?? null;
    if (!familyFromList) {
      setCurrentFamily(null);
      setMembers([]);
      setCategories([]);
      setEvents([]);
      return;
    }

    const rawMembers =
      familyFromList.members && familyFromList.members.length > 0
        ? familyFromList.members
        : await fetchFamilyMembers(resolvedFamilyId);

    const hydratedFamily = {
      ...familyFromList,
      members: rawMembers,
    };

    setFamilies((prev) => {
      const base = prev.length > 0 ? prev : list;
      return base.map((family) => (family.id === hydratedFamily.id ? hydratedFamily : family));
    });
    setCurrentFamily(hydratedFamily);
    setMembers(rawMembers.map(mapMember));

    const catsApi = await fetchFamilyCategories(resolvedFamilyId);
    setCategories(catsApi.map(mapCategory));

    const rows = await fetchFamilyEvents(resolvedFamilyId, dateRangeWindow());
    setEvents(rows.map(mapApiEventToCalEvent));
  }, []);

  const loadEverything = useCallback(async (preferredFamilyId?: number | null) => {
    if (!isAuthenticated || USE_MOCK_AUTH) {
      setFamilies([]);
      setCurrentFamily(null);
      setEvents([]);
      setMembers(FALLBACK_MEMBERS);
      setCategories([]);
      setFamilyId(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let list = await fetchFamilies();
      if (list.length === 0) {
        const created = await createFamily({ name: 'Mi familia' });
        list = [created];
      }
      setFamilies(list);
      await loadSelectedFamily(list, preferredFamilyId ?? familyId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error cargando datos';
      setError(msg);
      setFamilies([]);
      setCurrentFamily(null);
      setEvents([]);
      setMembers([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [familyId, isAuthenticated, loadSelectedFamily]);

  useEffect(() => {
    loadEverything();
  }, [loadEverything]);

  const refreshEvents = useCallback(async () => {
    if (!isAuthenticated || USE_MOCK_AUTH || familyId == null) return;
    try {
      const { syncGoogleCalendar } = await import('../lib/api');
      try {
        await syncGoogleCalendar();
      } catch {
        /* not connected or sync failed — still reload DB */
      }
      const range = dateRangeWindow();
      const rows = await fetchFamilyEvents(familyId, range);
      setEvents(rows.map(mapApiEventToCalEvent));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error';
      setError(msg);
    }
  }, [isAuthenticated, familyId]);

  const refreshFamilies = useCallback(async () => {
    await loadEverything(familyId);
  }, [familyId, loadEverything]);

  const selectFamily = useCallback(
    async (nextFamilyId: number) => {
      if (USE_MOCK_AUTH) {
        setFamilyId(nextFamilyId);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const list = await fetchFamilies();
        setFamilies(list);
        await loadSelectedFamily(list, nextFamilyId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cambiar de grupo';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [loadSelectedFamily]
  );

  const createGroup = useCallback(
    async (family: { name: string; description?: string; color?: string }) => {
      const created = await createFamily(family);
      await loadEverything(created.id);
    },
    [loadEverything]
  );

  const updateGroup = useCallback(
    async (family: { name?: string; description?: string; color?: string }) => {
      if (familyId == null) throw new Error('No hay grupo seleccionado');
      await updateFamily(familyId, family);
      await loadEverything(familyId);
    },
    [familyId, loadEverything]
  );

  const deleteCurrentGroup = useCallback(async () => {
    if (familyId == null) throw new Error('No hay grupo seleccionado');
    const nextFamilyId = families.find((family) => family.id !== familyId)?.id ?? null;
    await deleteFamily(familyId);
    await loadEverything(nextFamilyId);
  }, [families, familyId, loadEverything]);

  const joinGroup = useCallback(
    async (inviteCode: string) => {
      const joined = await joinFamily(inviteCode);
      await loadEverything(joined.family.id);
    },
    [loadEverything]
  );

  const regenerateInviteCode = useCallback(async (): Promise<string> => {
    if (familyId == null) throw new Error('No hay grupo seleccionado');
    const inviteCode = await regenerateFamilyInvite(familyId);
    setCurrentFamily((prev) => (prev ? { ...prev, invite_code: inviteCode } : prev));
    setFamilies((prev) =>
      prev.map((family) =>
        family.id === familyId ? { ...family, invite_code: inviteCode } : family
      )
    );
    return inviteCode;
  }, [familyId]);

  const updateGroupMemberHandler = useCallback(
    async (
      memberId: number,
      patch: { role?: 'admin' | 'member'; display_name?: string; color?: string; initials?: string }
    ) => {
      if (familyId == null) throw new Error('No hay grupo seleccionado');
      await updateFamilyMember(familyId, memberId, patch);
      await loadEverything(familyId);
    },
    [familyId, loadEverything]
  );

  const removeGroupMemberHandler = useCallback(
    async (memberId: number) => {
      if (familyId == null) throw new Error('No hay grupo seleccionado');
      await removeFamilyMember(familyId, memberId);
      await loadEverything(familyId);
    },
    [familyId, loadEverything]
  );

  const leaveCurrentGroup = useCallback(async () => {
    if (familyId == null) throw new Error('No hay grupo seleccionado');
    const nextFamilyId = families.find((family) => family.id !== familyId)?.id ?? null;
    await leaveFamily(familyId);
    await loadEverything(nextFamilyId);
  }, [families, familyId, loadEverything]);

  const addEvent = useCallback(
    async (data: Omit<CalEvent, 'id' | 'googleEventId'>): Promise<CalEvent> => {
      if (USE_MOCK_AUTH) {
        const local: CalEvent = { ...data, id: `local_${Date.now()}` };
        setEvents((prev) => [...prev, local]);
        return local;
      }
      if (!familyId) {
        throw new Error('Debes crear o unirte a un grupo antes de agregar eventos');
      }
      const catNum = data.categoryId ? Number(data.categoryId) : defaultCategoryId;
      const created = await createFamilyEvent(familyId, {
        title: data.title,
        description: data.description,
        date: data.date,
        start_time: data.allDay ? null : `${data.startTime}:00`,
        end_time: data.allDay ? null : `${data.endTime}:00`,
        all_day: data.allDay,
        location: data.location,
        priority: data.priority,
        category_id: Number.isFinite(catNum as number) ? (catNum as number) : defaultCategoryId,
        attendee_ids: data.memberIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n)),
      });
      const ev = mapApiEventToCalEvent(created);
      setEvents((prev) => [...prev.filter((e) => e.id !== ev.id), ev]);
      return ev;
    },
    [familyId, defaultCategoryId]
  );

  const updateEvent = useCallback(
    async (id: string, patch: Partial<CalEvent>) => {
      if (USE_MOCK_AUTH) {
        setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, ...patch } : event)));
        return;
      }
      if (!familyId) throw new Error('No hay grupo activo');

      const current = events.find((event) => event.id === id);
      if (!current) throw new Error('Evento no encontrado');

      const merged = { ...current, ...patch };
      const catNum = merged.categoryId ? Number(merged.categoryId) : defaultCategoryId;
      const updated = await updateFamilyEvent(familyId, Number(id), {
        title: merged.title,
        description: merged.description,
        date: merged.date,
        start_time: merged.allDay ? null : `${merged.startTime}:00`,
        end_time: merged.allDay ? null : `${merged.endTime}:00`,
        all_day: merged.allDay,
        location: merged.location,
        priority: merged.priority,
        category_id: Number.isFinite(catNum as number) ? (catNum as number) : defaultCategoryId,
        attendee_ids: merged.memberIds.map((memberId) => Number(memberId)).filter((n) => !Number.isNaN(n)),
      });

      const mapped = mapApiEventToCalEvent(updated);
      setEvents((prev) => prev.map((event) => (event.id === id ? mapped : event)));
    },
    [defaultCategoryId, events, familyId]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (USE_MOCK_AUTH) {
        setEvents((prev) => prev.filter((event) => event.id !== id));
        return;
      }
      if (!familyId) throw new Error('No hay grupo activo');
      await deleteFamilyEvent(familyId, Number(id));
      setEvents((prev) => prev.filter((event) => event.id !== id));
    },
    [familyId]
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
      value={{
        families,
        currentFamily,
        events,
        members,
        categories,
        defaultCategoryId,
        familyId,
        currentMembershipId,
        isCurrentFamilyAdmin,
        isLoading,
        error,
        refreshEvents,
        refreshFamilies,
        selectFamily,
        createGroup,
        updateGroup,
        deleteCurrentGroup,
        joinGroup,
        regenerateInviteCode,
        updateGroupMember: updateGroupMemberHandler,
        removeGroupMember: removeGroupMemberHandler,
        leaveCurrentGroup,
        addEvent,
        updateEvent,
        deleteEvent,
        getEventsForDate,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used inside EventsProvider');
  return ctx;
}
