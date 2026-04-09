/**
 * Family + event API helpers and mapping to CalEvent / Member / Category.
 */
import type { IoniconsName } from './mockData';
import type { CalEvent, Category, Member, Priority } from './mockData';
import { api } from './api';

export type ApiFamilyRow = {
  id: number;
  name: string;
  description?: string;
  color: string;
  invite_code: string;
  created_by_id?: number | null;
  created_at?: string;
  members?: ApiFamilyMemberRow[];
};

export type ApiFamilyMemberRow = {
  id: number;
  user_id: number;
  email: string;
  role: 'admin' | 'member';
  display_name: string;
  color: string;
  initials: string;
  joined_at?: string;
};

export type ApiCategoryRow = {
  id: number;
  label: string;
  icon: string;
  color: string;
  is_default: boolean;
  order: number;
};

export type ApiEventRow = {
  id: number;
  title: string;
  description: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  location: string;
  priority: string;
  category: ApiCategoryRow | null;
  attendees: { member_id: number }[];
  created_by?: { id: number; display_name: string } | null;
  google_event_id?: string | null;
};

function normalizeTime(t: string | null): string {
  if (!t) return '';
  const parts = t.split(':');
  const h = parts[0] ?? '00';
  const m = parts[1] ?? '00';
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

export function mapMember(row: ApiFamilyMemberRow): Member & { role: 'admin' | 'member' } {
  return {
    id: String(row.id),
    name: row.display_name || row.email.split('@')[0],
    color: row.color || '#60A5FA',
    initials: row.initials || row.display_name?.charAt(0).toUpperCase() || '?',
    role: row.role,
  };
}

export function mapCategory(row: ApiCategoryRow): Category {
  return {
    id: String(row.id),
    label: row.label,
    icon: (row.icon || 'ellipsis-horizontal') as IoniconsName,
    color: row.color || '#9CA3AF',
  };
}

export function mapApiEventToCalEvent(e: ApiEventRow): CalEvent {
  return {
    id: String(e.id),
    title: e.title,
    description: e.description || '',
    date: e.date,
    startTime: e.all_day ? '' : normalizeTime(e.start_time),
    endTime: e.all_day ? '' : normalizeTime(e.end_time),
    allDay: e.all_day,
    memberIds: (e.attendees || []).map((a) => String(a.member_id)),
    categoryId: e.category ? String(e.category.id) : '0',
    priority: e.priority as Priority,
    location: e.location || '',
    googleEventId: e.google_event_id ?? undefined,
    createdByMemberId: e.created_by?.id ? String(e.created_by.id) : null,
    createdByDisplayName: e.created_by?.display_name ?? null,
  };
}

export async function fetchFamilies(): Promise<ApiFamilyRow[]> {
  const res = await api.get('/api/families/');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudieron cargar las familias');
  }
  return res.json();
}

export async function createFamily(body: {
  name: string;
  description?: string;
  color?: string;
}): Promise<ApiFamilyRow> {
  const res = await api.post('/api/families/', body);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudo crear la familia');
  }
  return res.json();
}

export async function updateFamily(
  familyId: number,
  body: {
    name?: string;
    description?: string;
    color?: string;
  }
): Promise<ApiFamilyRow> {
  const res = await api.patch(`/api/families/${familyId}/`, body);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudo actualizar el grupo');
  }
  return res.json();
}

export async function deleteFamily(familyId: number): Promise<void> {
  const res = await api.delete(`/api/families/${familyId}/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudo eliminar el grupo');
  }
}

export async function regenerateFamilyInvite(familyId: number): Promise<string> {
  const res = await api.post(`/api/families/${familyId}/invite/`, {});
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudo generar el codigo de invitacion');
  }
  const data = (await res.json()) as { invite_code: string };
  return data.invite_code;
}

export async function joinFamily(inviteCode: string): Promise<{
  family: { id: number; name: string; color: string };
  member: ApiFamilyMemberRow;
}> {
  const res = await api.post('/api/families/join/', { invite_code: inviteCode.trim() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudo unir al grupo');
  }
  return res.json();
}

export async function fetchFamilyMembers(familyId: number): Promise<ApiFamilyMemberRow[]> {
  const res = await api.get(`/api/families/${familyId}/members/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudieron cargar los miembros');
  }
  return res.json();
}

export async function updateFamilyMember(
  familyId: number,
  memberId: number,
  body: {
    role?: 'admin' | 'member';
    display_name?: string;
    color?: string;
    initials?: string;
  }
): Promise<ApiFamilyMemberRow> {
  const res = await api.patch(`/api/families/${familyId}/members/${memberId}/`, body);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudo actualizar el miembro');
  }
  return res.json();
}

export async function removeFamilyMember(familyId: number, memberId: number): Promise<void> {
  const res = await api.delete(`/api/families/${familyId}/members/${memberId}/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudo quitar al miembro');
  }
}

export async function leaveFamily(familyId: number): Promise<void> {
  const res = await api.delete(`/api/families/${familyId}/members/me/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudo salir del grupo');
  }
}

export async function fetchFamilyCategories(familyId: number): Promise<ApiCategoryRow[]> {
  const res = await api.get(`/api/families/${familyId}/categories/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudieron cargar categorías');
  }
  return res.json();
}

export async function fetchFamilyEvents(
  familyId: number,
  range: { date_from: string; date_to: string }
): Promise<ApiEventRow[]> {
  const q = new URLSearchParams({ date_from: range.date_from, date_to: range.date_to });
  const res = await api.get(`/api/families/${familyId}/events/?${q.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudieron cargar eventos');
  }
  return res.json();
}

export async function createFamilyEvent(
  familyId: number,
  body: {
    title: string;
    description?: string;
    date: string;
    start_time?: string | null;
    end_time?: string | null;
    all_day: boolean;
    location?: string;
    priority: string;
    category_id: number | null;
    attendee_ids: number[];
  }
): Promise<ApiEventRow> {
  const res = await api.post(`/api/families/${familyId}/events/`, {
    title: body.title,
    description: body.description ?? '',
    date: body.date,
    start_time: body.all_day ? null : body.start_time ?? null,
    end_time: body.all_day ? null : body.end_time ?? null,
    all_day: body.all_day,
    location: body.location ?? '',
    priority: body.priority,
    category_id: body.category_id,
    attendee_ids: body.attendee_ids,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      typeof err === 'object' && err && Object.keys(err).length
        ? JSON.stringify(err)
        : 'No se pudo crear el evento';
    throw new Error(msg);
  }
  return res.json();
}

export async function updateFamilyEvent(
  familyId: number,
  eventId: number,
  body: {
    title?: string;
    description?: string;
    date?: string;
    start_time?: string | null;
    end_time?: string | null;
    all_day?: boolean;
    location?: string;
    priority?: string;
    category_id?: number | null;
    attendee_ids?: number[];
  }
): Promise<ApiEventRow> {
  const res = await api.patch(`/api/families/${familyId}/events/${eventId}/`, body);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      typeof err === 'object' && err && Object.keys(err).length
        ? JSON.stringify(err)
        : 'No se pudo actualizar el evento';
    throw new Error(msg);
  }
  return res.json();
}

export async function deleteFamilyEvent(familyId: number, eventId: number): Promise<void> {
  const res = await api.delete(`/api/families/${familyId}/events/${eventId}/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'No se pudo eliminar el evento');
  }
}
