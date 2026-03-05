/**
 * Shared types, static reference data, and seed events.
 * All dates are YYYY-MM-DD strings; times are HH:MM (24h).
 */
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconsName = ComponentProps<typeof Ionicons>['name'];

// ─── Core types ───────────────────────────────────────────────────────────────

export type LoadLevel = 'calm' | 'busy' | 'chaos' | 'empty';
export type Priority  = 'low' | 'medium' | 'high' | 'family';

export type Member = {
  id: string;
  name: string;
  color: string;
  initials: string;
};

export type Category = {
  id: string;
  label: string;
  icon: IoniconsName;
  color: string;
};

export type CalEvent = {
  id: string;
  title: string;
  description: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM — empty string when allDay
  endTime: string;    // HH:MM — empty string when allDay
  allDay: boolean;
  memberIds: string[];
  categoryId: string;
  priority: Priority;
  location: string;
};

// ─── Reference data ───────────────────────────────────────────────────────────

export const MEMBERS: Member[] = [
  { id: 'm1', name: 'Papá',  color: '#60A5FA', initials: 'P' },
  { id: 'm2', name: 'Mamá',  color: '#F472B6', initials: 'M' },
  { id: 'm3', name: 'Sofía', color: '#A78BFA', initials: 'S' },
  { id: 'm4', name: 'Luis',  color: '#FB923C', initials: 'L' },
];

export const CATEGORIES: Category[] = [
  { id: 'family',  label: 'Familia',  icon: 'people',              color: '#22C55E' },
  { id: 'school',  label: 'Escuela',  icon: 'school',              color: '#A78BFA' },
  { id: 'health',  label: 'Salud',    icon: 'medical',             color: '#FCA5A5' },
  { id: 'sport',   label: 'Deporte',  icon: 'football',            color: '#FCD34D' },
  { id: 'home',    label: 'Hogar',    icon: 'home',                color: '#86EFAC' },
  { id: 'food',    label: 'Comida',   icon: 'restaurant',          color: '#FB923C' },
  { id: 'other',   label: 'Otro',     icon: 'ellipsis-horizontal', color: '#9CA3AF' },
];

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  low:    { label: 'Baja',    color: '#86EFAC' },
  medium: { label: 'Media',   color: '#FCD34D' },
  high:   { label: 'Alta',    color: '#FCA5A5' },
  family: { label: 'Familia', color: '#60A5FA' },
};

export const LOCATION_PRESETS = [
  'Casa',
  'Colegio San Agustín',
  'Clínica Buen Pastor',
  'Polideportivo Sur',
  'Supermercado',
  'Restaurante Central',
  'Parque Municipal',
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function todayStr(): string {
  return dateStr(new Date());
}

export function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateStr(d);
}

/** HH:MM 24h */
export function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "09:30" → { h: 9, m: 30 } */
export function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(':').map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

/** "09:30" → "9:30 AM" */
export function formatTimeDisplay(t: string): string {
  if (!t) return '';
  const { h, m } = parseTime(t);
  const period = h < 12 ? 'AM' : 'PM';
  const hour   = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/** YYYY-MM-DD → short label for today/tomorrow/day name */
export function dateLabel(iso: string): string {
  const today    = todayStr();
  const tomorrow = offsetDate(1);
  if (iso === today)    return 'Hoy';
  if (iso === tomorrow) return 'Mañana';
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── Load level helpers ───────────────────────────────────────────────────────

export function priorityToLoad(priority: Priority): LoadLevel {
  if (priority === 'high')   return 'chaos';
  if (priority === 'medium') return 'busy';
  return 'calm';
}

export function eventsLoadLevel(events: CalEvent[]): LoadLevel {
  if (events.length === 0) return 'empty';
  if (events.some((e) => e.priority === 'high'))   return 'chaos';
  if (events.some((e) => e.priority === 'medium')) return 'busy';
  return 'calm';
}

// ─── Seed events (relative to today so they always show) ─────────────────────

export function getSeedEvents(): CalEvent[] {
  const today    = todayStr();
  const tomorrow = offsetDate(1);
  const d2       = offsetDate(2);
  const d3       = offsetDate(3);

  return [
    {
      id: 'seed_1',
      title: 'Desayuno familiar',
      description: '',
      date: today,
      startTime: '08:00',
      endTime: '08:30',
      allDay: false,
      memberIds: ['m1', 'm2', 'm3', 'm4'],
      categoryId: 'family',
      priority: 'low',
      location: 'Casa',
    },
    {
      id: 'seed_2',
      title: 'Llevar a Sofía al colegio',
      description: 'Colegio San Agustín',
      date: today,
      startTime: '09:00',
      endTime: '09:30',
      allDay: false,
      memberIds: ['m2', 'm3'],
      categoryId: 'school',
      priority: 'medium',
      location: 'Colegio San Agustín',
    },
    {
      id: 'seed_3',
      title: 'Almuerzo',
      description: 'Restaurante Central',
      date: today,
      startTime: '12:00',
      endTime: '13:00',
      allDay: false,
      memberIds: ['m1', 'm2'],
      categoryId: 'food',
      priority: 'low',
      location: 'Restaurante Central',
    },
    {
      id: 'seed_4',
      title: 'Control médico — Pedro',
      description: 'Posible conflicto con entrenamiento',
      date: today,
      startTime: '15:00',
      endTime: '16:30',
      allDay: false,
      memberIds: ['m2', 'm4'],
      categoryId: 'health',
      priority: 'high',
      location: 'Clínica Buen Pastor',
    },
    {
      id: 'seed_5',
      title: 'Entrenamiento de fútbol',
      description: '',
      date: today,
      startTime: '17:30',
      endTime: '19:00',
      allDay: false,
      memberIds: ['m1', 'm4'],
      categoryId: 'sport',
      priority: 'medium',
      location: 'Polideportivo Sur',
    },
    {
      id: 'seed_6',
      title: 'Cena familiar',
      description: '',
      date: today,
      startTime: '20:00',
      endTime: '21:00',
      allDay: false,
      memberIds: ['m1', 'm2', 'm3', 'm4'],
      categoryId: 'family',
      priority: 'low',
      location: 'Casa',
    },
    {
      id: 'seed_7',
      title: 'Reunión de colegio',
      description: '',
      date: tomorrow,
      startTime: '10:00',
      endTime: '11:30',
      allDay: false,
      memberIds: ['m1', 'm2'],
      categoryId: 'school',
      priority: 'medium',
      location: 'Colegio San Agustín',
    },
    {
      id: 'seed_8',
      title: 'Compras del supermercado',
      description: '',
      date: d2,
      startTime: '11:00',
      endTime: '12:30',
      allDay: false,
      memberIds: ['m2'],
      categoryId: 'home',
      priority: 'low',
      location: 'Supermercado',
    },
    {
      id: 'seed_9',
      title: 'Cumpleaños de abuela',
      description: 'Llevar pastel',
      date: d3,
      startTime: '18:00',
      endTime: '21:00',
      allDay: false,
      memberIds: ['m1', 'm2', 'm3', 'm4'],
      categoryId: 'family',
      priority: 'high',
      location: 'Casa',
    },
  ];
}
