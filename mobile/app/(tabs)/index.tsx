import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  RefreshControl,
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
  CATEGORIES as FALLBACK_CATEGORIES,
  CalEvent,
  Category,
  LoadLevel,
  Member,
  dateStr,
  eventsLoadLevel,
  formatTimeDisplay,
} from '../../lib/mockData';

const PRIMARY = '#22C55E';

const LOAD_COLOR: Record<LoadLevel, string> = {
  calm:  '#86EFAC',
  busy:  '#FCD34D',
  chaos: '#F87171',
  empty: 'transparent',
};

// ─── Week helpers ─────────────────────────────────────────────────────────────

type DayItem = { iso: string; label: string; dayNum: number; isToday: boolean };

function buildWeek(today: Date): DayItem[] {
  const labels    = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  const dow       = today.getDay();
  const monOffset = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + monOffset + i);
    return {
      iso:     dateStr(d),
      label:   labels[i],
      dayNum:  d.getDate(),
      isToday: dateStr(d) === dateStr(today),
    };
  });
}

function greeting(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  return `${g}, ${name.split(' ')[0]}`;
}

function fullDateLabel(d: Date): string {
  const raw = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ─── Fade-in hook ─────────────────────────────────────────────────────────────

function useFadeIn(delay = 0) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, tension: 70, friction: 10 }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
}

// ─── Avatar + member stack ────────────────────────────────────────────────────

function Avatar({ member, size = 24 }: { member: Member; size?: number }) {
  return (
    <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: member.color }]}>
      <Text style={[av.text, { fontSize: size * 0.38 }]}>{member.initials}</Text>
    </View>
  );
}
const av = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '800' },
});

function MemberStack({ ids, size = 20, borderBg }: { ids: string[]; size?: number; borderBg: string }) {
  const { members } = useEvents();
  const mems  = ids.map((id) => members.find((m) => m.id === id)!).filter(Boolean).slice(0, 3);
  const extra = Math.max(0, ids.length - 3);
  return (
    <View style={{ flexDirection: 'row' }}>
      {mems.map((m, i) => (
        <View key={m.id} style={{
          marginLeft: i === 0 ? 0 : -(size * 0.3),
          zIndex: mems.length - i,
          borderRadius: size / 2, borderWidth: 1.5, borderColor: borderBg,
        }}>
          <Avatar member={m} size={size} />
        </View>
      ))}
      {extra > 0 && (
        <View style={[av.wrap, {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: '#9CA3AF', marginLeft: -(size * 0.3), zIndex: 0,
        }]}>
          <Text style={[av.text, { fontSize: size * 0.36 }]}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

function DayCell({
  day, active, dayLoad, onPress, textColor, mutedColor,
}: {
  day: DayItem; active: boolean; dayLoad: LoadLevel;
  onPress: () => void; textColor: string; mutedColor: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.84, useNativeDriver: true, tension: 400, friction: 6 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={press}>
      <Animated.View style={[
        dc.cell,
        active && {
          backgroundColor: PRIMARY,
          shadowColor: PRIMARY, shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
        },
        { transform: [{ scale }] },
      ]}>
        <Text style={[dc.label, { color: active ? 'rgba(255,255,255,0.72)' : mutedColor }]}>
          {day.label}
        </Text>
        <Text style={[dc.num, {
          color:      active ? '#fff' : day.isToday ? PRIMARY : textColor,
          fontWeight: day.isToday && !active ? '800' : '600',
        }]}>
          {day.dayNum}
        </Text>
        <View style={[dc.dot, {
          backgroundColor: active ? 'rgba(255,255,255,0.55)' : LOAD_COLOR[dayLoad],
          opacity: dayLoad === 'empty' ? 0 : 1,
        }]} />
      </Animated.View>
    </Pressable>
  );
}
const dc = StyleSheet.create({
  cell:  { width: 40, alignItems: 'center', paddingVertical: 9, borderRadius: 16, gap: 3 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  num:   { fontSize: 17 },
  dot:   { width: 5, height: 5, borderRadius: 3 },
});

// ─── Member filter chip ───────────────────────────────────────────────────────

function MemberFilterChip({
  label, active, color, onPress, avatar, isDark,
}: {
  label: string; active: boolean; color: string;
  onPress: () => void; avatar?: Member; isDark: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, tension: 300, friction: 6 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={press}>
      <Animated.View style={[
        mfc.chip,
        active
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: isDark ? '#374151' : '#F3F4F6', borderColor: 'transparent' },
        { transform: [{ scale }] },
      ]}>
        {avatar && <Avatar member={avatar} size={16} />}
        <Text style={[mfc.text, { color: active ? '#fff' : (isDark ? '#9CA3AF' : '#6B7280') }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
const mfc = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 13,
    borderRadius: 999, borderWidth: 1.5,
  },
  text: { fontSize: 13, fontWeight: '600' },
});

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({
  event, cardBg, textColor, mutedColor, index, categories, currentMembershipId,
}: {
  event: CalEvent;
  cardBg: string;
  textColor: string;
  mutedColor: string;
  index: number;
  categories: Category[];
  currentMembershipId: number | null;
}) {
  const anim    = useFadeIn(index * 55);
  const scale   = useRef(new Animated.Value(1)).current;
  const cat     = categories.find((c) => c.id === event.categoryId)
    ?? categories[0]
    ?? FALLBACK_CATEGORIES[0];
  const isHigh  = event.priority === 'high';
  const isMine = currentMembershipId != null && event.createdByMemberId === String(currentMembershipId);
  const isBusyBlock = currentMembershipId != null && !isMine;
  const displayTitle = isBusyBlock ? 'Bloque ocupado' : event.title;
  const secondaryMeta = isBusyBlock
    ? `Reservado por ${event.createdByDisplayName || 'otro miembro'}`
    : event.location || event.description;

  const startDisplay = event.allDay ? 'Todo' : formatTimeDisplay(event.startTime).replace(' AM', '').replace(' PM', '');
  const startPeriod  = event.allDay ? ''     : (formatTimeDisplay(event.startTime).includes('AM') ? 'AM' : 'PM');
  const endDisplay   = event.allDay ? 'el día': formatTimeDisplay(event.endTime).replace(' AM', '').replace(' PM', '');

  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 8 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 8 }),
    ]).start();
    router.push(`/events/${event.id}`);
  };

  return (
    <Animated.View style={[anim, ec.wrap]}>
      <Pressable
        onPress={press}
        style={[
          ec.card, { backgroundColor: cardBg },
          isHigh && ec.cardHigh,
        ]}
      >
        {/* Category color bar */}
        <View style={[ec.bar, { backgroundColor: cat.color }]} />

        {/* Time column */}
        <View style={ec.timeCol}>
          <Text style={[ec.timeMain, { color: isHigh ? '#EF4444' : textColor }]}>
            {startDisplay}
          </Text>
          {startPeriod !== '' && (
            <Text style={[ec.timePeriod, { color: mutedColor }]}>{startPeriod}</Text>
          )}
          <Text style={[ec.timeEnd, { color: mutedColor }]}>{endDisplay}</Text>
        </View>

        {/* Thin separator */}
        <View style={[ec.divider, { backgroundColor: `${cat.color}28` }]} />

        {/* Body */}
        <View style={ec.body}>
          {/* Title row */}
          <View style={ec.titleRow}>
            <View style={[ec.catBadge, { backgroundColor: `${cat.color}20` }]}>
              <Ionicons name={cat.icon} size={11} color={cat.color} />
            </View>
            <Text style={[ec.title, { color: textColor }]} numberOfLines={1}>
              {displayTitle}
            </Text>
            {event.createdByDisplayName && (
              <View style={[ec.ownerBadge, { backgroundColor: isMine ? `${PRIMARY}18` : '#EEF2FF' }]}>
                <Text style={[ec.ownerBadgeText, { color: isMine ? PRIMARY : '#4F46E5' }]}>
                  {isMine ? 'Mío' : event.createdByDisplayName}
                </Text>
              </View>
            )}
            {!!event.googleEventId && (
              <View style={ec.gcalBadge}>
                <Ionicons name="logo-google" size={12} color="#4285F4" />
              </View>
            )}
            {isHigh && (
              <View style={ec.alertBadge}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
              </View>
            )}
          </View>

          {/* Location / description */}
          {secondaryMeta ? (
            <View style={ec.metaRow}>
              <Ionicons
                name={isBusyBlock ? 'time-outline' : event.location ? 'location-outline' : 'document-text-outline'}
                size={11}
                color={mutedColor}
              />
              <Text style={[ec.meta, { color: mutedColor }]} numberOfLines={1}>
                {secondaryMeta}
              </Text>
            </View>
          ) : null}

          {/* Members */}
          {event.memberIds.length > 0 && (
            <View style={ec.membersRow}>
              <MemberStack ids={event.memberIds} size={20} borderBg={cardBg} />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const ec = StyleSheet.create({
  wrap:     { marginBottom: 10 },
  card: {
    flexDirection: 'row', borderRadius: 18, overflow: 'hidden', minHeight: 84,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHigh: { borderWidth: 1, borderColor: '#FECACA' },
  bar:      { width: 5 },
  timeCol:  { width: 56, paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', gap: 1 },
  timeMain: { fontSize: 13, fontWeight: '800', letterSpacing: -0.3 },
  timePeriod:{ fontSize: 9, fontWeight: '600' },
  timeEnd:  { fontSize: 10, marginTop: 2 },
  divider:  { width: 1, marginVertical: 12 },
  body:     { flex: 1, paddingVertical: 12, paddingLeft: 10, paddingRight: 14, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catBadge: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  title:    { flex: 1, fontSize: 14, fontWeight: '700' },
  ownerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  ownerBadgeText: { fontSize: 10, fontWeight: '700' },
  gcalBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  alertBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta:     { fontSize: 11, flex: 1 },
  membersRow: { marginTop: 1 },
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDay({ mutedColor }: { mutedColor: string }) {
  const anim  = useFadeIn(80);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.spring(pulse, { toValue: 1.10, useNativeDriver: true, tension: 55, friction: 9 }),
        Animated.spring(pulse, { toValue: 1,    useNativeDriver: true, tension: 55, friction: 9 }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[em.wrap, anim]}>
      <Animated.View style={[em.iconWrap, { backgroundColor: `${PRIMARY}14`, transform: [{ scale: pulse }] }]}>
        <Ionicons name="calendar-outline" size={34} color={PRIMARY} />
      </Animated.View>
      <Text style={[em.title, { color: mutedColor }]}>Día libre</Text>
      <Text style={[em.sub,   { color: mutedColor }]}>No hay eventos programados</Text>
    </Animated.View>
  );
}
const em = StyleSheet.create({
  wrap:     { alignItems: 'center', paddingVertical: 52, gap: 10 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title:    { fontSize: 17, fontWeight: '700' },
  sub:      { fontSize: 13 },
});

// ─── Conflict alert bar ───────────────────────────────────────────────────────

function ConflictBar({ count }: { count: number }) {
  const anim = useFadeIn(0);
  return (
    <Animated.View style={[cb.wrap, anim]}>
      <View style={cb.iconWrap}>
        <Ionicons name="alert-circle" size={15} color="#EF4444" />
      </View>
      <Text style={cb.text}>
        {count === 1 ? '1 evento requiere atención' : `${count} eventos requieren atención`}
      </Text>
      <View style={cb.pill}>
        <Text style={cb.pillText}>Alta prioridad</Text>
      </View>
    </Animated.View>
  );
}
const cb = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 12, marginBottom: 14 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  text:     { flex: 1, fontSize: 13, fontWeight: '600', color: '#991B1B' },
  pill:     { backgroundColor: '#EF4444', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const insets      = useSafeAreaInsets();
  const { user }    = useAuth();
  const { getEventsForDate, members, categories, refreshEvents, currentMembershipId } = useEvents();
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const isDark      = colorScheme === 'dark';

  const bg          = isDark ? '#111827' : '#F2F2F7';
  const cardBg      = isDark ? '#1F2937' : '#FFFFFF';
  const textColor   = isDark ? '#F9FAFB' : '#111827';
  const mutedColor  = isDark ? '#9CA3AF' : '#8E8E93';
  const headerBg    = isDark ? '#1F2937' : '#FFFFFF';

  const today  = new Date();
  const week   = buildWeek(today);
  const [selIdx, setSelIdx] = useState(() => {
    const idx = week.findIndex((d) => d.isToday);
    return idx >= 0 ? idx : 0;
  });
  const [filterMember, setFilterMember] = useState<string | null>(null);

  const selectedDay   = week[selIdx];
  const dayEvents     = selectedDay ? getEventsForDate(selectedDay.iso) : [];
  const filteredEvts  = filterMember
    ? dayEvents.filter((e) => e.memberIds.includes(filterMember))
    : dayEvents;
  const myEvents = currentMembershipId == null
    ? filteredEvts
    : filteredEvts.filter((event) => event.createdByMemberId === String(currentMembershipId));
  const occupiedBlocks = currentMembershipId == null
    ? []
    : filteredEvts.filter((event) => event.createdByMemberId !== String(currentMembershipId));
  const conflictCount = dayEvents.filter((e) => e.priority === 'high').length;

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : 'Usuario';

  // Fade+slide the event list whenever the selected day changes
  const listOpacity = useRef(new Animated.Value(1)).current;
  const listSlide   = useRef(new Animated.Value(0)).current;
  const prevSel     = useRef(selIdx);
  useEffect(() => {
    if (prevSel.current === selIdx) return;
    prevSel.current = selIdx;
    listOpacity.setValue(0);
    listSlide.setValue(10);
    Animated.parallel([
      Animated.timing(listOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(listSlide,   { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [selIdx]);

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={[s.header, { backgroundColor: headerBg, paddingTop: insets.top + 14 }]}>
        {/* Decorative blobs */}
        <View style={[s.blob1, { backgroundColor: `${PRIMARY}12` }]} />
        <View style={[s.blob2, { backgroundColor: `${PRIMARY}08` }]} />

        {/* Top row */}
        <View style={s.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.greeting,  { color: mutedColor  }]}>{greeting(displayName)}</Text>
            <Text style={[s.dateLine,  { color: textColor   }]}>{fullDateLabel(today)}</Text>
          </View>
          <Pressable style={[s.iconBtn, { backgroundColor: bg }]}>
            <Ionicons name="notifications-outline" size={20} color={textColor} />
            <View style={[s.notifDot, { borderColor: headerBg }]} />
          </Pressable>
          <View style={[s.userAvatar, { backgroundColor: PRIMARY }]}>
            <Text style={s.userAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        {/* Week strip */}
        <View style={[s.weekStrip, { backgroundColor: bg }]}>
          {week.map((day, i) => (
            <DayCell
              key={day.iso}
              day={day}
              active={i === selIdx}
              dayLoad={eventsLoadLevel(getEventsForDate(day.iso))}
              onPress={() => setSelIdx(i)}
              textColor={textColor}
              mutedColor={mutedColor}
            />
          ))}
        </View>
      </View>

      {/* ── Agenda ───────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[s.agenda, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await refreshEvents();
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={PRIMARY}
          />
        }
      >
        {/* Agenda header */}
        <View style={s.agendaHeader}>
          <Text style={[s.agendaDay, { color: textColor }]}>
            {selectedDay?.isToday ? 'Hoy' : `${selectedDay?.label} ${selectedDay?.dayNum}`}
          </Text>
          <View style={[s.countPill, { backgroundColor: `${PRIMARY}18` }]}>
            <Ionicons name="calendar" size={12} color={PRIMARY} />
            <Text style={[s.countText, { color: PRIMARY }]}>
              {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
            </Text>
          </View>
        </View>

        {/* Conflict alert */}
        {conflictCount > 0 && <ConflictBar count={conflictCount} />}

        {/* Member filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
          contentContainerStyle={s.chipScroll}
        >
          <MemberFilterChip
            label="Todos"
            active={filterMember === null}
            color={PRIMARY}
            onPress={() => setFilterMember(null)}
            isDark={isDark}
          />
          {members.map((m) => (
            <MemberFilterChip
              key={m.id}
              label={m.name}
              active={filterMember === m.id}
              color={m.color}
              onPress={() => setFilterMember(filterMember === m.id ? null : m.id)}
              avatar={m}
              isDark={isDark}
            />
          ))}
        </ScrollView>

        {/* Event list — fades+slides when day changes */}
        <Animated.View style={{ opacity: listOpacity, transform: [{ translateY: listSlide }] }}>
          {filteredEvts.length === 0 ? (
            <EmptyDay mutedColor={mutedColor} />
          ) : (
            <>
              {myEvents.length > 0 && (
                <>
                  <View style={s.sectionRow}>
                    <Text style={[s.sectionLabel, { color: textColor }]}>Mis eventos</Text>
                    <Text style={[s.sectionMeta, { color: mutedColor }]}>{myEvents.length}</Text>
                  </View>
                  {myEvents.map((evt, i) => (
                    <EventCard
                      key={`mine-${selIdx}-${filterMember}-${evt.id}`}
                      event={evt}
                      cardBg={cardBg}
                      textColor={textColor}
                      mutedColor={mutedColor}
                      index={i}
                      categories={categories.length > 0 ? categories : FALLBACK_CATEGORIES}
                      currentMembershipId={currentMembershipId}
                    />
                  ))}
                </>
              )}

              {occupiedBlocks.length > 0 && (
                <>
                  <View style={s.sectionRow}>
                    <Text style={[s.sectionLabel, { color: textColor }]}>Ocupado por otros</Text>
                    <Text style={[s.sectionMeta, { color: mutedColor }]}>{occupiedBlocks.length}</Text>
                  </View>
                  {occupiedBlocks.map((evt, i) => (
                    <EventCard
                      key={`busy-${selIdx}-${filterMember}-${evt.id}`}
                      event={evt}
                      cardBg={cardBg}
                      textColor={textColor}
                      mutedColor={mutedColor}
                      index={i + myEvents.length}
                      categories={categories.length > 0 ? categories : FALLBACK_CATEGORIES}
                      currentMembershipId={currentMembershipId}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: 20, paddingBottom: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  blob1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    top: -80, right: -50,
  },
  blob2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    top: 20, left: -30,
  },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  greeting:     { fontSize: 13, fontWeight: '500', marginBottom: 3 },
  dateLine:     { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: 7, right: 7,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 2,
  },
  userAvatar:     { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  weekStrip: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderRadius: 20, padding: 8,
  },

  // Agenda
  agenda:       { paddingHorizontal: 16, paddingTop: 20 },
  agendaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  agendaDay:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  countPill:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  countText:    { fontSize: 12, fontWeight: '700' },
  chipScroll:   { gap: 8, paddingRight: 4 },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '800' },
  sectionMeta:  { fontSize: 12, fontWeight: '700' },
});
