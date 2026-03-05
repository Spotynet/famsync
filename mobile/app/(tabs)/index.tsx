import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { useEvents } from '../../contexts/EventsContext';
import { useColorScheme } from '../../hooks/use-color-scheme';
import {
  CATEGORIES,
  CalEvent,
  LoadLevel,
  MEMBERS,
  Member,
  dateStr,
  eventsLoadLevel,
  formatTimeDisplay,
  priorityToLoad,
} from '../../lib/mockData';

// ─── Theme ────────────────────────────────────────────────────────────────────

const PRIMARY = '#22C55E';
const LOAD_COLOR: Record<LoadLevel, string> = {
  calm:  '#86EFAC',
  busy:  '#FCD34D',
  chaos: '#FCA5A5',
  empty: 'transparent',
};

// ─── Week strip builder ───────────────────────────────────────────────────────

type DayItem = { iso: string; label: string; dayNum: number; isToday: boolean };

function buildWeek(today: Date): DayItem[] {
  const labels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
  const dow = today.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    return {
      iso: dateStr(d),
      label: labels[i],
      dayNum: d.getDate(),
      isToday: dateStr(d) === dateStr(today),
    };
  });
}

function monthYearLabel(d: Date) {
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function greeting(name: string) {
  const h = new Date().getHours();
  const s = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  return `${s}, ${name.split(' ')[0]}`;
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

function Avatar({ member, size = 26 }: { member: Member; size?: number }) {
  return (
    <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: member.color }]}>
      <Text style={[av.text, { fontSize: size * 0.36 }]}>{member.initials}</Text>
    </View>
  );
}
const av = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700' },
});

function MemberStack({ ids, size = 22 }: { ids: string[]; size?: number }) {
  const members = ids.map((id) => MEMBERS.find((m) => m.id === id)!).filter(Boolean).slice(0, 3);
  const extra   = Math.max(0, ids.length - 3);
  return (
    <View style={{ flexDirection: 'row' }}>
      {members.map((m, i) => (
        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -(size * 0.32), zIndex: members.length - i, borderRadius: size / 2, borderWidth: 1.5, borderColor: '#fff' }}>
          <Avatar member={m} size={size} />
        </View>
      ))}
      {extra > 0 && (
        <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#D1D5DB', marginLeft: -(size * 0.32) }]}>
          <Text style={[av.text, { fontSize: size * 0.36, color: '#6B7280' }]}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({
  event, cardBg, textColor, mutedColor,
}: {
  event: CalEvent; cardBg: string; textColor: string; mutedColor: string;
}) {
  const cat    = CATEGORIES.find((c) => c.id === event.categoryId) ?? CATEGORIES[0];
  const load   = priorityToLoad(event.priority);
  const accent = cat.color;           // category color for the left bar
  const isConflict = load === 'chaos';

  const timeStr = event.allDay
    ? 'Todo el día'
    : `${formatTimeDisplay(event.startTime)} – ${formatTimeDisplay(event.endTime)}`;

  return (
    <View style={[ec.card, { backgroundColor: cardBg }]}>
      <View style={[ec.bar, { backgroundColor: accent }]} />

      <View style={ec.timeCol}>
        {event.allDay ? (
          <Text style={[ec.allDay, { color: mutedColor }]}>Todo{'\n'}el día</Text>
        ) : (
          <>
            <Text style={[ec.timeText, { color: mutedColor }]}>{formatTimeDisplay(event.startTime)}</Text>
            <Text style={[ec.timeEnd,  { color: mutedColor }]}>{formatTimeDisplay(event.endTime)}</Text>
          </>
        )}
      </View>

      <View style={ec.body}>
        <View style={ec.titleRow}>
          <View style={[ec.iconWrap, { backgroundColor: `${cat.color}25` }]}>
            <Ionicons name={cat.icon} size={13} color={cat.color} />
          </View>
          <Text style={[ec.title, { color: textColor }]} numberOfLines={1}>{event.title}</Text>
          {isConflict && <Ionicons name="alert-circle" size={15} color="#EF4444" />}
        </View>
        {(event.description || event.location) ? (
          <Text style={[ec.sub, { color: mutedColor }]} numberOfLines={1}>
            {event.location || event.description}
          </Text>
        ) : null}
        {event.memberIds.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <MemberStack ids={event.memberIds} size={20} />
          </View>
        )}
      </View>
    </View>
  );
}

const ec = StyleSheet.create({
  card: {
    flexDirection: 'row', borderRadius: 16, marginBottom: 10,
    overflow: 'hidden', minHeight: 76,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  bar: { width: 4 },
  timeCol: { width: 58, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center' },
  timeText: { fontSize: 11, fontWeight: '700' },
  timeEnd:  { fontSize: 10, marginTop: 3 },
  allDay:   { fontSize: 9, textAlign: 'center', lineHeight: 13 },
  body: { flex: 1, paddingVertical: 12, paddingRight: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  iconWrap: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12 },
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDay({ mutedColor }: { mutedColor: string }) {
  return (
    <View style={es.wrap}>
      <View style={[es.icon, { backgroundColor: `${PRIMARY}15` }]}>
        <Ionicons name="calendar-outline" size={32} color={PRIMARY} />
      </View>
      <Text style={[es.title, { color: mutedColor }]}>Sin eventos</Text>
      <Text style={[es.sub, { color: mutedColor }]}>Toca el botón + para agregar uno</Text>
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getEventsForDate } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const bg         = isDark ? '#111827' : '#F2F2F7';
  const cardBg     = isDark ? '#1F2937' : '#FFFFFF';
  const textColor  = isDark ? '#F9FAFB' : '#111827';
  const mutedColor = isDark ? '#9CA3AF' : '#8E8E93';
  const headerBg   = isDark ? '#1F2937' : '#FFFFFF';

  const today    = new Date();
  const week     = buildWeek(today);
  const todayIdx = week.findIndex((d) => d.isToday);
  const [selIdx, setSelIdx] = useState(todayIdx >= 0 ? todayIdx : 0);

  const selectedDay    = week[selIdx];
  const dayEvents      = selectedDay ? getEventsForDate(selectedDay.iso) : [];
  const [filterMember, setFilterMember] = useState<string | null>(null);

  const filteredEvents = filterMember
    ? dayEvents.filter((e) => e.memberIds.includes(filterMember))
    : dayEvents;

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : 'Usuario';

  return (
    <View style={[s.wrapper, { backgroundColor: bg }]}>
      {/* ── Header ───────────────────────────────────────── */}
      <View style={[s.header, { backgroundColor: headerBg, paddingTop: insets.top + 12 }]}>
        {/* Top row */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.greeting, { color: mutedColor }]}>{greeting(displayName)}</Text>
            <Text style={[s.monthLabel, { color: textColor }]}>
              {monthYearLabel(today).charAt(0).toUpperCase() + monthYearLabel(today).slice(1)}
            </Text>
          </View>
          <Pressable style={[s.notifBtn, { backgroundColor: bg }]}>
            <Ionicons name="notifications-outline" size={22} color={textColor} />
            <View style={s.notifDot} />
          </Pressable>
          <View style={[s.userAvatar, { backgroundColor: PRIMARY }]}>
            <Text style={s.userAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        {/* Week strip */}
        <View style={s.weekRow}>
          {week.map((day, i) => {
            const dayLoad = eventsLoadLevel(getEventsForDate(day.iso));
            const active  = i === selIdx;
            return (
              <Pressable
                key={day.iso}
                style={[s.dayCol, active && { backgroundColor: PRIMARY, borderRadius: 14 }]}
                onPress={() => setSelIdx(i)}
              >
                <Text style={[s.dayLabel, { color: active ? '#fff' : mutedColor }]}>{day.label}</Text>
                <Text style={[s.dayNum, {
                  color: active ? '#fff' : day.isToday ? PRIMARY : textColor,
                  fontWeight: day.isToday ? '800' : '500',
                }]}>
                  {day.dayNum}
                </Text>
                <View style={[s.loadDot, {
                  backgroundColor: active ? 'rgba(255,255,255,0.55)' : LOAD_COLOR[dayLoad],
                  opacity: dayLoad === 'empty' ? 0 : 1,
                }]} />
              </Pressable>
            );
          })}
        </View>

        {/* Legend */}
        <View style={s.legend}>
          {([['Tranquilo', LOAD_COLOR.calm], ['Ocupado', LOAD_COLOR.busy], ['Caos', LOAD_COLOR.chaos]] as [string, string][]).map(([lbl, color]) => (
            <View key={lbl} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: color }]} />
              <Text style={[s.legendText, { color: mutedColor }]}>{lbl}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Agenda ───────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[s.agenda, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section header */}
        <View style={s.agendaHeader}>
          <Text style={[s.agendaTitle, { color: textColor }]}>
            {selectedDay?.isToday ? 'Hoy' : `${selectedDay?.label} ${selectedDay?.dayNum}`}
          </Text>
          <Text style={[s.agendaCount, { color: mutedColor }]}>
            {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
          </Text>
        </View>

        {/* Member filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          <Pressable
            style={[chip.base, filterMember === null && chip.active]}
            onPress={() => setFilterMember(null)}
          >
            <Text style={[chip.text, filterMember === null && chip.textActive]}>Todos</Text>
          </Pressable>
          {MEMBERS.map((m) => (
            <Pressable
              key={m.id}
              style={[chip.base, filterMember === m.id && { ...chip.active, backgroundColor: m.color }]}
              onPress={() => setFilterMember(filterMember === m.id ? null : m.id)}
            >
              <Avatar member={m} size={16} />
              <Text style={[chip.text, filterMember === m.id && chip.textActive]}>{m.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Events or empty state */}
        {filteredEvents.length === 0 ? (
          <EmptyDay mutedColor={mutedColor} />
        ) : (
          filteredEvents.map((evt) => (
            <EventCard key={evt.id} event={evt} cardBg={cardBg} textColor={textColor} mutedColor={mutedColor} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const chip = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#E5E5EA' },
  active: { backgroundColor: PRIMARY },
  text: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  textActive: { color: '#fff' },
});

const s = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  monthLabel: { fontSize: 20, fontWeight: '800' },
  notifBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: { position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#fff' },
  userAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  dayCol: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 4 },
  dayLabel: { fontSize: 11, fontWeight: '600' },
  dayNum: { fontSize: 16 },
  loadDot: { width: 6, height: 6, borderRadius: 3 },

  legend: { flexDirection: 'row', gap: 14, paddingBottom: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontSize: 10, fontWeight: '600' },

  agenda: { paddingHorizontal: 20, paddingTop: 18 },
  agendaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  agendaTitle: { fontSize: 18, fontWeight: '800' },
  agendaCount: { fontSize: 13 },
});
