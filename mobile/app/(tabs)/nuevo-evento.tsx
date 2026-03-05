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
  MEMBERS,
  Priority,
  dateLabel,
  formatTime,
  formatTimeDisplay,
  offsetDate,
  todayStr,
} from '../../lib/mockData';

const PRIMARY = '#22C55E';
const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

// ─── Time picker bottom sheet ─────────────────────────────────────────────────

function TimePicker({
  visible, value, label, onConfirm, onClose, cardBg, textColor, mutedColor, borderColor,
}: {
  visible: boolean; value: string; label: string;
  onConfirm: (t: string) => void; onClose: () => void;
  cardBg: string; textColor: string; mutedColor: string; borderColor: string;
}) {
  const ITEM_H = 52;
  const parsed = value.split(':').map(Number);
  const [selH, setSelH] = useState(parsed[0] ?? 9);
  const [selM, setSelM] = useState(parsed[1] ?? 0);
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
          <View style={[tp.header, { borderBottomColor: borderColor }]}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[tp.btn, { color: mutedColor }]}>Cancelar</Text>
            </Pressable>
            <Text style={[tp.title, { color: textColor }]}>{label}</Text>
            <Pressable onPress={() => { onConfirm(formatTime(selH, selM)); onClose(); }} hitSlop={12}>
              <Text style={[tp.btn, { color: PRIMARY, fontWeight: '700' }]}>Listo</Text>
            </Pressable>
          </View>

          {/* Preview */}
          <View style={tp.preview}>
            <Text style={[tp.previewText, { color: PRIMARY }]}>
              {formatTimeDisplay(formatTime(selH, selM))}
            </Text>
          </View>

          {/* Wheels */}
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
                const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
                setSelH(Math.min(23, Math.max(0, idx)));
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16, fontWeight: '700' },
  btn: { fontSize: 16 },
  preview: { alignItems: 'center', paddingVertical: 20 },
  previewText: { fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 8 },
  item: { height: 52, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 24 },
  colon: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
});

// ─── Divider ──────────────────────────────────────────────────────────────────

function Row({
  icon, iconColor, iconBg, label, right, borderColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string; iconBg: string; label: string;
  right?: React.ReactNode; borderColor: string;
}) {
  return (
    <>
      <View style={rw.row}>
        <View style={[rw.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={rw.label}>{label}</Text>
        {right}
      </View>
      <View style={[rw.sep, { backgroundColor: borderColor }]} />
    </>
  );
}

const rw = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  iconBox: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 15, color: '#111827' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
});

// ─── Success overlay ──────────────────────────────────────────────────────────

function SuccessOverlay({ onDone }: { onDone: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1, useNativeDriver: true, tension: 55, friction: 7,
    }).start(() => setTimeout(onDone, 700));
  }, []);

  return (
    <View style={su.overlay}>
      <Animated.View style={[su.circle, { transform: [{ scale }] }]}>
        <Ionicons name="checkmark" size={44} color="#fff" />
      </Animated.View>
      <Text style={su.text}>¡Evento guardado!</Text>
    </View>
  );
}

const su = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  circle: { width: 96, height: 96, borderRadius: 48, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  text: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: 'low',    label: 'Baja',  color: '#4ADE80' },
  { id: 'medium', label: 'Media', color: '#FACC15' },
  { id: 'high',   label: 'Alta',  color: '#F87171' },
];

export default function NuevoEventoScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { addEvent } = useEvents();

  const bg     = isDark ? '#111827' : '#F2F2F7';
  const card   = isDark ? '#1F2937' : '#FFFFFF';
  const text   = isDark ? '#F9FAFB' : '#111827';
  const muted  = isDark ? '#6B7280' : '#8E8E93';
  const border = isDark ? '#374151' : '#E5E5EA';

  // Form state
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [date, setDate]         = useState(todayStr());
  const [startTime, setStart]   = useState('09:00');
  const [endTime, setEnd]       = useState('10:00');
  const [allDay, setAllDay]     = useState(false);
  const [members, setMembers]   = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>('medium');
  const [location, setLocation] = useState('');
  const [saved, setSaved]       = useState(false);

  const [showStart, setShowStart]     = useState(false);
  const [showEnd, setShowEnd]         = useState(false);

  const dateOptions = Array.from({ length: 5 }, (_, i) => ({
    iso: offsetDate(i),
    label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : dateLabel(offsetDate(i)),
  }));

  const toggleMember = (id: string) =>
    setMembers((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);

  const canSave = title.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await addEvent({
      title: title.trim(), description: desc.trim(),
      date, startTime: allDay ? '' : startTime,
      endTime: allDay ? '' : endTime, allDay,
      memberIds: members, categoryId: 'family',
      priority, location: location.trim(),
    });
    setSaved(true);
  };

  const reset = () => {
    setTitle(''); setDesc(''); setDate(todayStr());
    setStart('09:00'); setEnd('10:00'); setAllDay(false);
    setMembers([]); setPriority('medium'); setLocation('');
    setSaved(false);
    router.navigate('/(tabs)');
  };

  return (
    <>
      <TimePicker visible={showStart} value={startTime} label="Hora de inicio"
        onConfirm={setStart} onClose={() => setShowStart(false)}
        cardBg={card} textColor={text} mutedColor={muted} borderColor={border} />
      <TimePicker visible={showEnd} value={endTime} label="Hora de fin"
        onConfirm={setEnd} onClose={() => setShowEnd(false)}
        cardBg={card} textColor={text} mutedColor={muted} borderColor={border} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.screen, { backgroundColor: bg }]}>

          {/* Nav */}
          <View style={[s.nav, { backgroundColor: card, borderBottomColor: border, paddingTop: insets.top + 10 }]}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={[s.navCancel, { color: muted }]}>Cancelar</Text>
            </Pressable>
            <Text style={[s.navTitle, { color: text }]}>Nuevo evento</Text>
            <Pressable
              style={[s.navSave, { opacity: canSave ? 1 : 0.38 }]}
              disabled={!canSave}
              onPress={handleSave}
            >
              <Text style={s.navSaveText}>Guardar</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Title + description ── */}
            <View style={[s.card, { backgroundColor: card }]}>
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
              <View style={[s.descRow, { borderTopColor: border }]}>
                <Ionicons name="create-outline" size={16} color={muted} style={{ marginTop: 2 }} />
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

            {/* ── When ── */}
            <View>
              <Text style={[s.sectionLabel, { color: muted }]}>CUÁNDO</Text>
              <View style={[s.card, { backgroundColor: card }]}>
                {/* Date chips */}
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipRow}
                >
                  {dateOptions.map((opt) => {
                    const active = opt.iso === date;
                    return (
                      <Pressable
                        key={opt.iso}
                        onPress={() => setDate(opt.iso)}
                        style={[s.chip, active ? s.chipActive : { borderColor: border }]}
                      >
                        <Text style={[s.chipText, { color: active ? '#fff' : muted }]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={[s.sepLine, { backgroundColor: border }]} />

                {/* Start time */}
                <Pressable style={s.timeRow} onPress={() => !allDay && setShowStart(true)}>
                  <Text style={[s.timeLabel, { color: text }]}>Inicio</Text>
                  {allDay
                    ? <Text style={[s.timeValue, { color: muted }]}>—</Text>
                    : <Text style={[s.timeValue, { color: PRIMARY }]}>{formatTimeDisplay(startTime)}</Text>
                  }
                </Pressable>

                <View style={[s.sepLine, { backgroundColor: border, marginLeft: 16 }]} />

                {/* End time */}
                <Pressable style={s.timeRow} onPress={() => !allDay && setShowEnd(true)}>
                  <Text style={[s.timeLabel, { color: text }]}>Fin</Text>
                  {allDay
                    ? <Text style={[s.timeValue, { color: muted }]}>—</Text>
                    : <Text style={[s.timeValue, { color: PRIMARY }]}>{formatTimeDisplay(endTime)}</Text>
                  }
                </Pressable>

                <View style={[s.sepLine, { backgroundColor: border, marginLeft: 16 }]} />

                {/* All day */}
                <View style={s.timeRow}>
                  <Text style={[s.timeLabel, { color: text }]}>Todo el día</Text>
                  <Switch
                    value={allDay}
                    onValueChange={setAllDay}
                    trackColor={{ false: border, true: PRIMARY }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </View>

            {/* ── Who's going ── */}
            <View>
              <Text style={[s.sectionLabel, { color: muted }]}>PARTICIPANTES</Text>
              <View style={[s.card, { backgroundColor: card, paddingVertical: 16, paddingHorizontal: 16 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
                  {MEMBERS.map((m) => {
                    const sel = members.includes(m.id);
                    return (
                      <Pressable key={m.id} onPress={() => toggleMember(m.id)} style={s.memberCol}>
                        <View style={[s.avatar, { backgroundColor: sel ? m.color : isDark ? '#374151' : '#E5E7EB' }]}>
                          <Text style={[s.avatarText, { color: sel ? '#fff' : muted }]}>{m.initials}</Text>
                          {sel && (
                            <View style={s.avatarCheck}>
                              <Ionicons name="checkmark" size={10} color="#fff" />
                            </View>
                          )}
                        </View>
                        <Text style={[s.memberName, { color: sel ? text : muted, fontWeight: sel ? '600' : '400' }]}>
                          {m.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* ── Priority ── */}
            <View>
              <Text style={[s.sectionLabel, { color: muted }]}>PRIORIDAD</Text>
              <View style={[s.card, { backgroundColor: card }]}>
                {PRIORITIES.map((p, i) => {
                  const active = p.id === priority;
                  return (
                    <View key={p.id}>
                      <Pressable
                        style={[s.priorityRow, active && { backgroundColor: isDark ? '#22C55E18' : '#F0FDF4' }]}
                        onPress={() => setPriority(p.id)}
                      >
                        <View style={[s.priorityDot, { backgroundColor: p.color }]} />
                        <Text style={[s.priorityLabel, { color: active ? PRIMARY : text }]}>{p.label}</Text>
                        {active && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
                      </Pressable>
                      {i < PRIORITIES.length - 1 && (
                        <View style={[s.sepLine, { backgroundColor: border, marginLeft: 52 }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── Location ── */}
            <View>
              <Text style={[s.sectionLabel, { color: muted }]}>UBICACIÓN</Text>
              <View style={[s.card, { backgroundColor: card }]}>
                <View style={s.locationRow}>
                  <View style={[s.locIcon, { backgroundColor: `${PRIMARY}18` }]}>
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
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {saved && <SuccessOverlay onDone={reset} />}
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navCancel: { fontSize: 16, minWidth: 72 },
  navTitle: { fontSize: 17, fontWeight: '700' },
  navSave: {
    backgroundColor: PRIMARY, paddingVertical: 8, paddingHorizontal: 18,
    borderRadius: 20, minWidth: 72, alignItems: 'center',
  },
  navSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.6,
    marginBottom: 8, marginLeft: 4,
  },

  card: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },

  titleInput: {
    fontSize: 22, fontWeight: '700',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  descRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  descInput: { flex: 1, fontSize: 14, lineHeight: 20, minHeight: 32 },

  chipRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  chip: {
    paddingVertical: 7, paddingHorizontal: 16,
    borderRadius: 999, borderWidth: 1.5,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13, fontWeight: '600' },

  sepLine: { height: StyleSheet.hairlineWidth },

  timeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  timeLabel: { fontSize: 15, fontWeight: '500' },
  timeValue: { fontSize: 15, fontWeight: '700' },

  memberCol: { alignItems: 'center', gap: 6 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  avatarCheck: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  memberName: { fontSize: 12 },

  priorityRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  priorityDot: { width: 14, height: 14, borderRadius: 7, marginHorizontal: 7 },
  priorityLabel: { flex: 1, fontSize: 15, fontWeight: '500' },

  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  locIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  locInput: { flex: 1, fontSize: 15 },
});
