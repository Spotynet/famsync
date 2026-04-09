import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEvents } from '../../contexts/EventsContext';
import { useColorScheme } from '../../hooks/use-color-scheme';
import {
  Member,
  Priority,
  formatTime,
  formatTimeDisplay,
  offsetDate,
  todayStr,
} from '../../lib/mockData';

const PRIMARY = '#22C55E';
const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

// ─── Fade-in hook ─────────────────────────────────────────────────────────────

function useFadeIn(delay = 0) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(22)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, tension: 68, friction: 11 }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ text, color }: { text: string; color: string }) {
  return (
    <View style={sl.row}>
      <View style={sl.bar} />
      <Text style={[sl.text, { color }]}>{text}</Text>
    </View>
  );
}
const sl = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10, marginLeft: 2 },
  bar:  { width: 3, height: 13, borderRadius: 2, backgroundColor: PRIMARY },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 1.0 },
});

// ─── Time picker ──────────────────────────────────────────────────────────────

function TimePicker({
  visible, value, label, onConfirm, onClose,
  cardBg, textColor, mutedColor, borderColor,
}: {
  visible: boolean; value: string; label: string;
  onConfirm: (t: string) => void; onClose: () => void;
  cardBg: string; textColor: string; mutedColor: string; borderColor: string;
}) {
  const ITEM_H = 52;
  const [selH, setSelH] = useState(() => parseInt(value.split(':')[0]) || 9);
  const [selM, setSelM] = useState(() => parseInt(value.split(':')[1]) || 0);
  const hourRef   = useRef<FlatList>(null);
  const minuteRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      const [h, m] = value.split(':').map(Number);
      setSelH(h ?? 9);
      setSelM(m ?? 0);
    }
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={tp.overlay} onPress={onClose}>
        <Pressable style={[tp.sheet, { backgroundColor: cardBg }]} onPress={(e) => e.stopPropagation()}>
          <View style={[tp.handle, { backgroundColor: borderColor }]} />
          <View style={[tp.header, { borderBottomColor: borderColor }]}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[tp.actionBtn, { color: mutedColor }]}>Cancelar</Text>
            </Pressable>
            <Text style={[tp.title, { color: textColor }]}>{label}</Text>
            <Pressable onPress={() => { onConfirm(formatTime(selH, selM)); onClose(); }} hitSlop={12}>
              <Text style={[tp.actionBtn, { color: PRIMARY, fontWeight: '700' }]}>Listo</Text>
            </Pressable>
          </View>
          <View style={tp.preview}>
            <Text style={[tp.previewText, { color: PRIMARY }]}>
              {formatTimeDisplay(formatTime(selH, selM))}
            </Text>
          </View>
          <View style={tp.wheels}>
            <FlatList
              ref={hourRef}
              data={HOURS}
              keyExtractor={(i) => `h${i}`}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_H}
              decelerationRate="fast"
              initialScrollIndex={selH}
              getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
              onMomentumScrollEnd={(e) => {
                setSelH(Math.min(23, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM_H))));
              }}
              renderItem={({ item }) => (
                <Pressable
                  style={[tp.item, item === selH && { backgroundColor: `${PRIMARY}18`, borderRadius: 12 }]}
                  onPress={() => { setSelH(item); hourRef.current?.scrollToIndex({ index: item, animated: true }); }}
                >
                  <Text style={[tp.itemText, { color: item === selH ? PRIMARY : mutedColor, fontWeight: item === selH ? '800' : '400' }]}>
                    {String(item).padStart(2, '0')}
                  </Text>
                </Pressable>
              )}
              style={{ height: ITEM_H * 5, width: 80 }}
            />
            <Text style={[tp.colon, { color: textColor }]}>:</Text>
            <FlatList
              ref={minuteRef}
              data={MINUTES}
              keyExtractor={(i) => `m${i}`}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_H}
              decelerationRate="fast"
              initialScrollIndex={Math.max(0, MINUTES.indexOf(selM))}
              getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
                setSelM(MINUTES[Math.min(MINUTES.length - 1, Math.max(0, idx))]);
              }}
              renderItem={({ item }) => (
                <Pressable
                  style={[tp.item, item === selM && { backgroundColor: `${PRIMARY}18`, borderRadius: 12 }]}
                  onPress={() => { setSelM(item); minuteRef.current?.scrollToIndex({ index: MINUTES.indexOf(item), animated: true }); }}
                >
                  <Text style={[tp.itemText, { color: item === selM ? PRIMARY : mutedColor, fontWeight: item === selM ? '800' : '400' }]}>
                    {String(item).padStart(2, '0')}
                  </Text>
                </Pressable>
              )}
              style={{ height: ITEM_H * 5, width: 80 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const tp = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 36 },
  handle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title:       { fontSize: 16, fontWeight: '700' },
  actionBtn:   { fontSize: 16 },
  preview:     { alignItems: 'center', paddingVertical: 24 },
  previewText: { fontSize: 52, fontWeight: '800', letterSpacing: -2 },
  wheels:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 8 },
  item:        { height: 52, alignItems: 'center', justifyContent: 'center' },
  itemText:    { fontSize: 24 },
  colon:       { fontSize: 32, fontWeight: '800', marginBottom: 4 },
});

// ─── Date chip ─────────────────────────────────────────────────────────────────

function DateChip({
  iso, dayTop, active, onPress, muted, border,
}: {
  iso: string; dayTop: string; active: boolean;
  onPress: () => void; muted: string; border: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const day   = parseInt(iso.split('-')[2], 10);

  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, tension: 300, friction: 5 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 7 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={press}>
      <Animated.View style={[
        dc.chip,
        active
          ? { backgroundColor: PRIMARY, borderColor: PRIMARY, shadowColor: PRIMARY, shadowOpacity: 0.38, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5 }
          : { backgroundColor: 'transparent', borderColor: border },
        { transform: [{ scale }] },
      ]}>
        <Text style={[dc.top, { color: active ? 'rgba(255,255,255,0.72)' : muted }]}>{dayTop}</Text>
        <Text style={[dc.num, { color: active ? '#fff' : muted }]}>{day}</Text>
      </Animated.View>
    </Pressable>
  );
}
const dc = StyleSheet.create({
  chip: { width: 54, alignItems: 'center', paddingVertical: 10, borderRadius: 18, borderWidth: 1.5 },
  top:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  num:  { fontSize: 22, fontWeight: '800', marginTop: 1, letterSpacing: -0.5 },
});

// ─── Member bubble ─────────────────────────────────────────────────────────────

function MemberBubble({
  member, selected, onPress, muted,
}: {
  member: Member; selected: boolean;
  onPress: () => void; muted: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.2,  useNativeDriver: true, tension: 300, friction: 5 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 7 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={press} style={mb.col}>
      <Animated.View style={[
        mb.avatar,
        {
          backgroundColor: selected ? member.color : 'transparent',
          borderColor: selected ? member.color : `${muted}50`,
          transform: [{ scale }],
        },
        selected && { shadowColor: member.color, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.42, shadowRadius: 8, elevation: 4 },
      ]}>
        <Text style={[mb.initials, { color: selected ? '#fff' : muted }]}>{member.initials}</Text>
        {selected && (
          <View style={mb.checkBadge}>
            <Ionicons name="checkmark" size={9} color="#fff" />
          </View>
        )}
      </Animated.View>
      <Text style={[mb.name, { color: selected ? member.color : muted, fontWeight: selected ? '700' : '400' }]}>
        {member.name.split(' ')[0]}
      </Text>
    </Pressable>
  );
}
const mb = StyleSheet.create({
  col:        { alignItems: 'center', gap: 7 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, position: 'relative',
  },
  initials:   { fontSize: 18, fontWeight: '800' },
  checkBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  name:       { fontSize: 11 },
});

// ─── Priority chip ─────────────────────────────────────────────────────────────

const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: 'low',    label: 'Baja',  color: '#4ADE80' },
  { id: 'medium', label: 'Media', color: '#FACC15' },
  { id: 'high',   label: 'Alta',  color: '#F87171' },
];

function PriorityChip({
  p, active, onPress, isDark,
}: {
  p: typeof PRIORITIES[0]; active: boolean; onPress: () => void; isDark: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, tension: 300, friction: 5 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={press} style={{ flex: 1 }}>
      <Animated.View style={[
        pc.chip,
        {
          backgroundColor: active ? `${p.color}20` : 'transparent',
          borderColor: active ? p.color : (isDark ? '#374151' : '#E5E7EB'),
          borderWidth: active ? 2 : 1.5,
          transform: [{ scale }],
        },
      ]}>
        <View style={[pc.dot, { backgroundColor: p.color }]} />
        <Text style={[pc.label, {
          color: active ? p.color : (isDark ? '#9CA3AF' : '#6B7280'),
          fontWeight: active ? '800' : '500',
        }]}>
          {p.label}
        </Text>
        {active && <Ionicons name="checkmark" size={13} color={p.color} />}
      </Animated.View>
    </Pressable>
  );
}
const pc = StyleSheet.create({
  chip:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 16,
  },
  dot:   { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 14 },
});

// ─── Success overlay ──────────────────────────────────────────────────────────

function SuccessOverlay({ onDone }: { onDone: () => void }) {
  const circleScale = useRef(new Animated.Value(0)).current;
  const bgOpacity   = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide   = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(bgOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(circleScale, { toValue: 1, useNativeDriver: true, tension: 55, friction: 7 }),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(textSlide,   { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      ]),
    ]).start(() => setTimeout(onDone, 900));
  }, []);

  return (
    <Animated.View style={[su.overlay, { opacity: bgOpacity }]}>
      <Animated.View style={[su.circle, { transform: [{ scale: circleScale }] }]}>
        <Ionicons name="checkmark" size={48} color="#fff" />
      </Animated.View>
      <Animated.View style={{ alignItems: 'center', gap: 6, opacity: textOpacity, transform: [{ translateY: textSlide }] }}>
        <Text style={su.title}>¡Evento creado!</Text>
        <Text style={su.sub}>Se ha añadido a tu calendario familiar</Text>
      </Animated.View>
    </Animated.View>
  );
}
const su = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 99,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  circle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  sub:   { color: 'rgba(255,255,255,0.62)', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NuevoEventoScreen() {
  const insets      = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark      = colorScheme === 'dark';
  const {
    addEvent,
    members: familyMembers,
    defaultCategoryId,
    categories,
    familyId,
    currentMembershipId,
  } = useEvents();

  const bg     = isDark ? '#111827' : '#F2F2F7';
  const card   = isDark ? '#1F2937' : '#FFFFFF';
  const text   = isDark ? '#F9FAFB' : '#111827';
  const muted  = isDark ? '#6B7280' : '#9CA3AF';
  const border = isDark ? '#374151' : '#E5E5EA';

  // Form state
  const [title,     setTitle]     = useState('');
  const [desc,      setDesc]      = useState('');
  const [date,      setDate]      = useState(todayStr());
  const [startTime, setStart]     = useState('09:00');
  const [endTime,   setEnd]       = useState('10:00');
  const [allDay,    setAllDay]    = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    currentMembershipId ? [String(currentMembershipId)] : []
  );
  const [priority,  setPriority]  = useState<Priority>('medium');
  const [location,  setLocation]  = useState('');
  const [saved,     setSaved]     = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showEnd,   setShowEnd]   = useState(false);

  const canSave = title.trim().length > 0 && familyId != null;

  // Save button animation reacts to canSave
  const saveScale   = useRef(new Animated.Value(0.94)).current;
  const saveOpacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(saveScale,   { toValue: canSave ? 1 : 0.97, useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.timing(saveOpacity, { toValue: canSave ? 1 : 0.45, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [canSave]);

  // Date options: today + next 4 days
  const dateOptions = Array.from({ length: 5 }, (_, i) => {
    const iso = offsetDate(i);
    const [y, mo, d] = iso.split('-').map(Number);
    const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const top = i === 0 ? 'HOY' : i === 1 ? 'MÑ' : DOW[new Date(y, mo - 1, d).getDay()];
    return { iso, top };
  });

  const toggleMember = (id: string) =>
    setSelectedMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  useEffect(() => {
    if (currentMembershipId && selectedMemberIds.length === 0) {
      setSelectedMemberIds([String(currentMembershipId)]);
    }
  }, [currentMembershipId, selectedMemberIds.length]);

  const handleSave = async () => {
    if (!canSave) return;
    const catId =
      defaultCategoryId != null
        ? String(defaultCategoryId)
        : (categories[0]?.id ?? '0');
    await addEvent({
      title: title.trim(),
      description: desc.trim(),
      date,
      startTime: allDay ? '' : startTime,
      endTime: allDay ? '' : endTime,
      allDay,
      memberIds: selectedMemberIds,
      categoryId: catId,
      priority,
      location: location.trim(),
    });
    setSaved(true);
  };

  const reset = () => {
    setTitle(''); setDesc(''); setDate(todayStr());
    setStart('09:00'); setEnd('10:00'); setAllDay(false);
    setSelectedMemberIds(currentMembershipId ? [String(currentMembershipId)] : []);
    setPriority('medium'); setLocation('');
    setSaved(false);
    router.navigate('/(tabs)');
  };

  // Staggered section entrance animations
  const a0 = useFadeIn(0);
  const a1 = useFadeIn(80);
  const a2 = useFadeIn(160);
  const a3 = useFadeIn(240);
  const a4 = useFadeIn(320);

  return (
    <>
      <TimePicker
        visible={showStart} value={startTime} label="Hora de inicio"
        onConfirm={setStart} onClose={() => setShowStart(false)}
        cardBg={card} textColor={text} mutedColor={muted} borderColor={border}
      />
      <TimePicker
        visible={showEnd} value={endTime} label="Hora de fin"
        onConfirm={setEnd} onClose={() => setShowEnd(false)}
        cardBg={card} textColor={text} mutedColor={muted} borderColor={border}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.screen, { backgroundColor: bg }]}>

          {/* ── Header ───────────────────────────────────────────────────────── */}
          <View style={[s.header, { backgroundColor: card, borderBottomColor: border, paddingTop: insets.top + 12 }]}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
              <Ionicons name="chevron-back" size={22} color={text} />
            </Pressable>
            <View style={s.headerCenter}>
              <Text style={[s.headerTitle, { color: text }]}>Nuevo evento</Text>
              <Text style={[s.headerSub, { color: muted }]}>Añade los detalles</Text>
            </View>
            {/* Spacer keeps title centered */}
            <View style={{ width: 36 }} />
          </View>

          {/* ── Scrollable form ──────────────────────────────────────────────── */}
          <ScrollView
            contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── 1. Title + description ── */}
            <Animated.View style={a0}>
              {familyId == null && (
                <View style={[s.noticeCard, { backgroundColor: `${PRIMARY}12`, borderColor: `${PRIMARY}30` }]}>
                  <Ionicons name="people-outline" size={18} color={PRIMARY} />
                  <Text style={s.noticeText}>
                    Crea o unete a un grupo desde Perfil para poder guardar eventos reales.
                  </Text>
                </View>
              )}

              <View style={[s.card, { backgroundColor: card }]}>
                <View style={s.titleRow}>
                  <View style={[s.titleIconWrap, { backgroundColor: `${PRIMARY}18` }]}>
                    <Ionicons name="calendar" size={17} color={PRIMARY} />
                  </View>
                  <TextInput
                    style={[s.titleInput, { color: text }]}
                    placeholder="Nombre del evento"
                    placeholderTextColor={muted}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={60}
                    returnKeyType="next"
                    autoFocus
                  />
                </View>
                {title.length > 0 && (
                  <Text style={[s.charCount, { color: muted }]}>{title.length}/60</Text>
                )}
                <View style={[s.descRow, { borderTopColor: border }]}>
                  <Ionicons name="create-outline" size={15} color={muted} style={{ marginTop: 3 }} />
                  <TextInput
                    style={[s.descInput, { color: text }]}
                    placeholder="Descripción (opcional)"
                    placeholderTextColor={muted}
                    value={desc}
                    onChangeText={setDesc}
                    multiline
                  />
                </View>
              </View>
            </Animated.View>

            {/* ── 2. When ── */}
            <Animated.View style={[s.section, a1]}>
              <SectionLabel text="CUÁNDO" color={muted} />
              <View style={[s.card, { backgroundColor: card }]}>

                {/* Date chips */}
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipRow}
                >
                  {dateOptions.map((opt) => (
                    <DateChip
                      key={opt.iso}
                      iso={opt.iso}
                      dayTop={opt.top}
                      active={opt.iso === date}
                      onPress={() => setDate(opt.iso)}
                      muted={muted}
                      border={border}
                    />
                  ))}
                </ScrollView>

                <View style={[s.sep, { backgroundColor: border }]} />

                {/* Start time */}
                <Pressable
                  style={({ pressed }) => [s.timeRow, pressed && !allDay && { backgroundColor: isDark ? '#ffffff08' : '#00000005' }]}
                  onPress={() => !allDay && setShowStart(true)}
                >
                  <View style={[s.timeIconWrap, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}>
                    <Ionicons name="time-outline" size={15} color="#3B82F6" />
                  </View>
                  <Text style={[s.timeLabel, { color: text }]}>Inicio</Text>
                  <Text style={[s.timeValue, { color: allDay ? muted : PRIMARY }]}>
                    {allDay ? '—' : formatTimeDisplay(startTime)}
                  </Text>
                  {!allDay && <Ionicons name="chevron-forward" size={14} color={muted} />}
                </Pressable>

                <View style={[s.sep, { backgroundColor: border, marginLeft: 58 }]} />

                {/* End time */}
                <Pressable
                  style={({ pressed }) => [s.timeRow, pressed && !allDay && { backgroundColor: isDark ? '#ffffff08' : '#00000005' }]}
                  onPress={() => !allDay && setShowEnd(true)}
                >
                  <View style={[s.timeIconWrap, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}>
                    <Ionicons name="time" size={15} color="#3B82F6" />
                  </View>
                  <Text style={[s.timeLabel, { color: text }]}>Fin</Text>
                  <Text style={[s.timeValue, { color: allDay ? muted : PRIMARY }]}>
                    {allDay ? '—' : formatTimeDisplay(endTime)}
                  </Text>
                  {!allDay && <Ionicons name="chevron-forward" size={14} color={muted} />}
                </Pressable>

                <View style={[s.sep, { backgroundColor: border, marginLeft: 58 }]} />

                {/* All day toggle */}
                <View style={s.timeRow}>
                  <View style={[s.timeIconWrap, { backgroundColor: `${PRIMARY}18` }]}>
                    <Ionicons name="sunny-outline" size={15} color={PRIMARY} />
                  </View>
                  <Text style={[s.timeLabel, { color: text }]}>Todo el día</Text>
                  <Switch
                    value={allDay}
                    onValueChange={setAllDay}
                    trackColor={{ false: border, true: PRIMARY }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </Animated.View>

            {/* ── 3. Participants ── */}
            <Animated.View style={[s.section, a2]}>
              <SectionLabel text="PARTICIPANTES" color={muted} />
              <View style={[s.card, { backgroundColor: card }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.membersRow}
                >
                  {familyMembers.map((m) => (
                    <MemberBubble
                      key={m.id}
                      member={m}
                      selected={selectedMemberIds.includes(m.id)}
                      onPress={() => toggleMember(m.id)}
                      muted={muted}
                    />
                  ))}
                </ScrollView>
                {selectedMemberIds.length > 0 && (
                  <View style={[s.memberCount, { borderTopColor: border }]}>
                    <Ionicons name="people" size={13} color={PRIMARY} />
                    <Text style={[s.memberCountText, { color: PRIMARY }]}>
                      {selectedMemberIds.length}{' '}
                      {selectedMemberIds.length === 1 ? 'participante seleccionado' : 'participantes seleccionados'}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* ── 4. Priority ── */}
            <Animated.View style={[s.section, a3]}>
              <SectionLabel text="PRIORIDAD" color={muted} />
              <View style={s.priorityWrap}>
                {PRIORITIES.map((p) => (
                  <PriorityChip
                    key={p.id}
                    p={p}
                    active={p.id === priority}
                    onPress={() => setPriority(p.id)}
                    isDark={isDark}
                  />
                ))}
              </View>
            </Animated.View>

            {/* ── 5. Location ── */}
            <Animated.View style={[s.section, a4]}>
              <SectionLabel text="UBICACIÓN" color={muted} />
              <View style={[s.card, { backgroundColor: card }]}>
                <View style={s.locRow}>
                  <View style={[s.locIconWrap, { backgroundColor: `${PRIMARY}18` }]}>
                    <Ionicons name="location-outline" size={16} color={PRIMARY} />
                  </View>
                  <TextInput
                    style={[s.locInput, { color: text }]}
                    placeholder="¿Dónde será el evento?"
                    placeholderTextColor={muted}
                    value={location}
                    onChangeText={setLocation}
                    returnKeyType="done"
                  />
                  {location.length > 0 && (
                    <Pressable onPress={() => setLocation('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={muted} />
                    </Pressable>
                  )}
                </View>
              </View>
            </Animated.View>
          </ScrollView>

          {/* ── Floating save button ─────────────────────────────────────────── */}
          <View style={[s.saveWrap, { paddingBottom: insets.bottom + 16, borderTopColor: border, backgroundColor: bg }]}>
            <Animated.View style={{ transform: [{ scale: saveScale }], opacity: saveOpacity }}>
              <Pressable
                style={[
                  s.saveBtn,
                  {
                    backgroundColor: canSave ? PRIMARY : (isDark ? '#374151' : '#E5E7EB'),
                    shadowColor: canSave ? PRIMARY : 'transparent',
                  },
                ]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Ionicons name="checkmark-circle" size={20} color={canSave ? '#fff' : muted} />
                <Text style={[s.saveBtnText, { color: canSave ? '#fff' : muted }]}>
                  Guardar evento
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {saved && <SuccessOverlay onDone={reset} />}
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  headerSub:    { fontSize: 12, marginTop: 2 },

  // Layout
  scroll:  { padding: 16 },
  section: { marginTop: 22 },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  // Card wrapper
  card: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },

  // Title section
  titleRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  titleIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  titleInput:   { flex: 1, fontSize: 20, fontWeight: '700' },
  charCount:    { fontSize: 11, textAlign: 'right', paddingRight: 16, marginTop: -4, marginBottom: 8 },
  descRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  descInput:    { flex: 1, fontSize: 14, lineHeight: 20, minHeight: 32 },

  // Separator
  sep: { height: StyleSheet.hairlineWidth },

  // Date chips
  chipRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },

  // Time rows
  timeRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  timeIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  timeLabel:   { flex: 1, fontSize: 15, fontWeight: '500' },
  timeValue:   { fontSize: 15, fontWeight: '700' },

  // Members
  membersRow:      { paddingHorizontal: 20, paddingVertical: 18, gap: 20 },
  memberCount:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  memberCountText: { fontSize: 12, fontWeight: '600' },

  // Priority
  priorityWrap: { flexDirection: 'row', gap: 10 },

  // Location
  locRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  locIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  locInput:   { flex: 1, fontSize: 15 },

  // Save button
  saveWrap: {
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 18, gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38, shadowRadius: 14, elevation: 6,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },
});
