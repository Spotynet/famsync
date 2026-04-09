import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmModal } from '../../components/ui/confirm-modal';
import { useEvents } from '../../contexts/EventsContext';
import { useColorScheme } from '../../hooks/use-color-scheme';
import type { Member, Priority } from '../../lib/mockData';

const PRIMARY = '#22C55E';

const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: 'low', label: 'Baja', color: '#4ADE80' },
  { id: 'medium', label: 'Media', color: '#FACC15' },
  { id: 'high', label: 'Alta', color: '#F87171' },
  { id: 'family', label: 'Familia', color: '#60A5FA' },
];

function MemberChip({
  member,
  selected,
  disabled,
  onPress,
}: {
  member: Member;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        s.memberChip,
        {
          backgroundColor: selected ? member.color : 'transparent',
          borderColor: selected ? member.color : '#D1D5DB',
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[s.memberChipText, { color: selected ? '#fff' : '#6B7280' }]}>
        {member.name}
      </Text>
    </Pressable>
  );
}

function PriorityChip({
  priority,
  active,
  disabled,
  onPress,
}: {
  priority: (typeof PRIORITIES)[number];
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        s.priorityChip,
        {
          backgroundColor: active ? `${priority.color}20` : 'transparent',
          borderColor: active ? priority.color : '#D1D5DB',
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[s.priorityChipText, { color: active ? priority.color : '#6B7280' }]}>
        {priority.label}
      </Text>
    </Pressable>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const {
    events,
    members,
    currentMembershipId,
    isCurrentFamilyAdmin,
    updateEvent,
    deleteEvent,
  } = useEvents();

  const bg = isDark ? '#111827' : '#F2F2F7';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const mutedColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  const event = useMemo(() => events.find((item) => item.id === String(id)) ?? null, [events, id]);
  const canManage = !!event && (
    isCurrentFamilyAdmin || (
      currentMembershipId != null && event.createdByMemberId === String(currentMembershipId)
    )
  );

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [date, setDate] = useState(event?.date ?? '');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startTime, setStartTime] = useState(event?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(event?.endTime ?? '10:00');
  const [location, setLocation] = useState(event?.location ?? '');
  const [priority, setPriority] = useState<Priority>(event?.priority ?? 'medium');
  const [memberIds, setMemberIds] = useState<string[]>(event?.memberIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!event) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[s.screen, { backgroundColor: bg, paddingTop: insets.top + 24 }]}>
          <View style={[s.header, { borderBottomColor: borderColor, backgroundColor: cardBg }]}>
            <Pressable onPress={() => router.back()} style={s.headerIcon}>
              <Ionicons name="chevron-back" size={22} color={textColor} />
            </Pressable>
            <Text style={[s.headerTitle, { color: textColor }]}>Evento</Text>
            <View style={s.headerIcon} />
          </View>
          <View style={s.centerState}>
            <Ionicons name="calendar-outline" size={34} color={mutedColor} />
            <Text style={[s.centerText, { color: mutedColor }]}>No se encontro el evento.</Text>
          </View>
        </View>
      </>
    );
  }

  const toggleMember = (memberId: string) => {
    setMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((idValue) => idValue !== memberId) : [...prev, memberId]
    );
  };

  const handleSave = async () => {
    if (!canManage) return;
    if (!title.trim()) {
      setError('El nombre del evento es obligatorio.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateEvent(event.id, {
        title: title.trim(),
        description: description.trim(),
        date: date.trim(),
        allDay,
        startTime: allDay ? '' : startTime.trim(),
        endTime: allDay ? '' : endTime.trim(),
        location: location.trim(),
        priority,
        memberIds,
      });
      router.back();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo guardar el evento');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteEvent(event.id);
      setConfirmDelete(false);
      router.replace('/(tabs)');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el evento');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ConfirmModal
        visible={confirmDelete}
        title="Eliminar evento"
        message="Esta accion quitara el evento del calendario del grupo."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        danger
        icon="trash-outline"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <View style={[s.screen, { backgroundColor: bg }]}>
        <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: borderColor, backgroundColor: cardBg }]}>
          <Pressable onPress={() => router.back()} style={s.headerIcon}>
            <Ionicons name="chevron-back" size={22} color={textColor} />
          </Pressable>
          <Text style={[s.headerTitle, { color: textColor }]}>
            {canManage ? 'Editar evento' : 'Bloque ocupado'}
          </Text>
          {canManage ? (
            <Pressable onPress={() => setConfirmDelete(true)} style={s.headerIcon}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </Pressable>
          ) : (
            <View style={s.headerIcon} />
          )}
        </View>

        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
          {error && (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {!canManage && (
            <View style={[s.infoBanner, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="eye-outline" size={16} color="#4F46E5" />
              <Text style={s.infoText}>
                Este bloque pertenece a {event.createdByDisplayName || 'otro miembro'} y se muestra
                como horario ocupado.
              </Text>
            </View>
          )}

          <View style={[s.card, { backgroundColor: cardBg }]}>
            <Text style={[s.label, { color: mutedColor }]}>Titulo</Text>
            <TextInput
              editable={canManage}
              style={[s.input, { color: textColor, borderColor }]}
              value={canManage ? title : 'Bloque ocupado'}
              onChangeText={setTitle}
              placeholder="Nombre del evento"
              placeholderTextColor={mutedColor}
            />

            <Text style={[s.label, { color: mutedColor }]}>Fecha</Text>
            <TextInput
              editable={canManage}
              style={[s.input, { color: textColor, borderColor }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={mutedColor}
            />

            <View style={s.switchRow}>
              <Text style={[s.label, { color: mutedColor, marginBottom: 0 }]}>Todo el dia</Text>
              <Switch
                value={allDay}
                onValueChange={setAllDay}
                disabled={!canManage}
                trackColor={{ false: borderColor, true: PRIMARY }}
                thumbColor="#fff"
              />
            </View>

            {!allDay && (
              <View style={s.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: mutedColor }]}>Inicio</Text>
                  <TextInput
                    editable={canManage}
                    style={[s.input, { color: textColor, borderColor }]}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="09:00"
                    placeholderTextColor={mutedColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: mutedColor }]}>Fin</Text>
                  <TextInput
                    editable={canManage}
                    style={[s.input, { color: textColor, borderColor }]}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="10:00"
                    placeholderTextColor={mutedColor}
                  />
                </View>
              </View>
            )}

            <Text style={[s.label, { color: mutedColor }]}>Ubicacion</Text>
            <TextInput
              editable={canManage}
              style={[s.input, { color: textColor, borderColor }]}
              value={location}
              onChangeText={setLocation}
              placeholder="Opcional"
              placeholderTextColor={mutedColor}
            />

            <Text style={[s.label, { color: mutedColor }]}>Descripcion</Text>
            <TextInput
              editable={canManage}
              multiline
              style={[s.input, s.multilineInput, { color: textColor, borderColor }]}
              value={canManage ? description : `Reservado por ${event.createdByDisplayName || 'otro miembro'}`}
              onChangeText={setDescription}
              placeholder="Notas"
              placeholderTextColor={mutedColor}
            />
          </View>

          <View style={[s.card, { backgroundColor: cardBg }]}>
            <Text style={[s.label, { color: mutedColor }]}>Prioridad</Text>
            <View style={s.priorityWrap}>
              {PRIORITIES.map((item) => (
                <PriorityChip
                  key={item.id}
                  priority={item}
                  active={priority === item.id}
                  disabled={!canManage}
                  onPress={() => setPriority(item.id)}
                />
              ))}
            </View>
          </View>

          <View style={[s.card, { backgroundColor: cardBg }]}>
            <Text style={[s.label, { color: mutedColor }]}>Participantes</Text>
            <View style={s.memberWrap}>
              {members.map((member) => (
                <MemberChip
                  key={member.id}
                  member={member}
                  selected={memberIds.includes(member.id)}
                  disabled={!canManage}
                  onPress={() => toggleMember(member.id)}
                />
              ))}
            </View>
          </View>

          <View style={[s.metaCard, { backgroundColor: cardBg }]}>
            <View style={s.metaRow}>
              <Text style={[s.metaLabel, { color: mutedColor }]}>Creado por</Text>
              <Text style={[s.metaValue, { color: textColor }]}>
                {event.createdByDisplayName || 'Desconocido'}
              </Text>
            </View>
            <View style={[s.metaSeparator, { backgroundColor: borderColor }]} />
            <View style={s.metaRow}>
              <Text style={[s.metaLabel, { color: mutedColor }]}>Origen</Text>
              <Text style={[s.metaValue, { color: textColor }]}>
                {event.googleEventId ? 'Google Calendar' : 'Calendario familiar'}
              </Text>
            </View>
          </View>

          {canManage && (
            <Pressable style={s.saveBtn} onPress={handleSave} disabled={busy}>
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={s.saveBtnText}>Guardar cambios</Text>
                </>
              )}
            </Pressable>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  centerText: {
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoText: {
    flex: 1,
    color: '#4338CA',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  priorityChip: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  memberChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memberChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  metaSeparator: {
    height: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
