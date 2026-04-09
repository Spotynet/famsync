import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmModal } from '../components/ui/confirm-modal';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventsContext';
import { useColorScheme } from '../hooks/use-color-scheme';
import type { ApiFamilyMemberRow } from '../lib/eventsApi';

const PRIMARY = '#22C55E';
const GROUP_COLORS = ['#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#F97316', '#14B8A6'];

type GroupFormState = {
  name: string;
  description: string;
  color: string;
};

type MemberFormState = {
  displayName: string;
  initials: string;
  color: string;
  role: 'admin' | 'member';
};

function initialsFromName(name: string, fallbackEmail?: string): string {
  const base = name.trim() || fallbackEmail?.split('@')[0] || '';
  const parts = base.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join('');
  return initials.slice(0, 3);
}

function GroupModal({
  visible,
  title,
  submitLabel,
  value,
  onChange,
  onClose,
  onSubmit,
  busy,
  cardBg,
  textColor,
  mutedColor,
  borderColor,
}: {
  visible: boolean;
  title: string;
  submitLabel: string;
  value: GroupFormState;
  onChange: (next: GroupFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  busy: boolean;
  cardBg: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={[m.sheet, { backgroundColor: cardBg }]} onPress={(event) => event.stopPropagation()}>
          <View style={[m.handle, { backgroundColor: borderColor }]} />
          <View style={[m.header, { borderBottomColor: borderColor }]}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[m.action, { color: mutedColor }]}>Cancelar</Text>
            </Pressable>
            <Text style={[m.title, { color: textColor }]}>{title}</Text>
            <Pressable onPress={onSubmit} disabled={busy} hitSlop={12}>
              <Text style={[m.action, { color: PRIMARY, fontWeight: '700', opacity: busy ? 0.5 : 1 }]}>
                {submitLabel}
              </Text>
            </Pressable>
          </View>

          <View style={m.body}>
            <Text style={[m.label, { color: mutedColor }]}>Nombre del grupo</Text>
            <TextInput
              style={[m.input, { color: textColor, borderColor }]}
              value={value.name}
              onChangeText={(name) => onChange({ ...value, name })}
              placeholder="Mi familia"
              placeholderTextColor={mutedColor}
              autoFocus
            />

            <Text style={[m.label, { color: mutedColor }]}>Descripcion</Text>
            <TextInput
              style={[m.input, m.multilineInput, { color: textColor, borderColor }]}
              value={value.description}
              onChangeText={(description) => onChange({ ...value, description })}
              placeholder="Una breve descripcion del grupo"
              placeholderTextColor={mutedColor}
              multiline
            />

            <Text style={[m.label, { color: mutedColor }]}>Color</Text>
            <View style={m.colorRow}>
              {GROUP_COLORS.map((color) => {
                const selected = value.color === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => onChange({ ...value, color })}
                    style={[
                      m.colorDot,
                      { backgroundColor: color, borderColor: selected ? textColor : 'transparent' },
                    ]}
                  >
                    {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function JoinGroupModal({
  visible,
  inviteCode,
  onChange,
  onClose,
  onSubmit,
  busy,
  cardBg,
  textColor,
  mutedColor,
  borderColor,
}: {
  visible: boolean;
  inviteCode: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  busy: boolean;
  cardBg: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={[m.sheet, { backgroundColor: cardBg }]} onPress={(event) => event.stopPropagation()}>
          <View style={[m.handle, { backgroundColor: borderColor }]} />
          <View style={[m.header, { borderBottomColor: borderColor }]}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[m.action, { color: mutedColor }]}>Cancelar</Text>
            </Pressable>
            <Text style={[m.title, { color: textColor }]}>Unirme a un grupo</Text>
            <Pressable onPress={onSubmit} disabled={busy} hitSlop={12}>
              <Text style={[m.action, { color: PRIMARY, fontWeight: '700', opacity: busy ? 0.5 : 1 }]}>
                Unirme
              </Text>
            </Pressable>
          </View>

          <View style={m.body}>
            <Text style={[m.label, { color: mutedColor }]}>Codigo de invitacion</Text>
            <TextInput
              style={[m.input, { color: textColor, borderColor, letterSpacing: 2 }]}
              value={inviteCode}
              onChangeText={(value) => onChange(value.toUpperCase())}
              placeholder="AB12CD34EF56"
              placeholderTextColor={mutedColor}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InviteModal({
  visible,
  groupName,
  inviteCode,
  canRegenerate,
  busy,
  onShare,
  onRegenerate,
  onClose,
  cardBg,
  textColor,
  mutedColor,
  borderColor,
}: {
  visible: boolean;
  groupName: string;
  inviteCode: string;
  canRegenerate: boolean;
  busy: boolean;
  onShare: () => void;
  onRegenerate: () => void;
  onClose: () => void;
  cardBg: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={[m.centerCard, { backgroundColor: cardBg }]} onPress={(event) => event.stopPropagation()}>
          <View style={[gm.iconCircle, { backgroundColor: `${PRIMARY}18` }]}>
            <Ionicons name="person-add" size={24} color={PRIMARY} />
          </View>
          <Text style={[gm.title, { color: textColor }]}>Invitar a {groupName}</Text>
          <Text style={[gm.sub, { color: mutedColor }]}>
            Comparte este codigo para que otra persona pueda unirse al grupo.
          </Text>

          <View style={[gm.codeBox, { borderColor, backgroundColor: `${PRIMARY}10` }]}>
            <Text style={[gm.code, { color: textColor }]}>{inviteCode}</Text>
          </View>

          <Pressable style={gm.primaryBtn} onPress={onShare}>
            <Ionicons name="share-social" size={16} color="#fff" />
            <Text style={gm.primaryBtnText}>Compartir codigo</Text>
          </Pressable>

          {canRegenerate && (
            <Pressable
              style={[gm.secondaryBtn, { borderColor }]}
              onPress={onRegenerate}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color={PRIMARY} />
                  <Text style={gm.secondaryBtnText}>Regenerar codigo</Text>
                </>
              )}
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MemberModal({
  visible,
  member,
  value,
  canEditRole,
  canRemove,
  busy,
  onChange,
  onSubmit,
  onRemove,
  onClose,
  cardBg,
  textColor,
  mutedColor,
  borderColor,
}: {
  visible: boolean;
  member: ApiFamilyMemberRow | null;
  value: MemberFormState;
  canEditRole: boolean;
  canRemove: boolean;
  busy: boolean;
  onChange: (next: MemberFormState) => void;
  onSubmit: () => void;
  onRemove: () => void;
  onClose: () => void;
  cardBg: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={[m.sheet, { backgroundColor: cardBg }]} onPress={(event) => event.stopPropagation()}>
          <View style={[m.handle, { backgroundColor: borderColor }]} />
          <View style={[m.header, { borderBottomColor: borderColor }]}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[m.action, { color: mutedColor }]}>Cancelar</Text>
            </Pressable>
            <Text style={[m.title, { color: textColor }]}>Editar miembro</Text>
            <Pressable onPress={onSubmit} disabled={busy} hitSlop={12}>
              <Text style={[m.action, { color: PRIMARY, fontWeight: '700', opacity: busy ? 0.5 : 1 }]}>
                Guardar
              </Text>
            </Pressable>
          </View>

          <View style={m.body}>
            <Text style={[m.label, { color: mutedColor }]}>Nombre visible</Text>
            <TextInput
              style={[m.input, { color: textColor, borderColor }]}
              value={value.displayName}
              onChangeText={(displayName) =>
                onChange({
                  ...value,
                  displayName,
                  initials: initialsFromName(displayName, member?.email),
                })
              }
              placeholder="Nombre del miembro"
              placeholderTextColor={mutedColor}
              autoFocus
            />

            <View style={mm.row}>
              <View style={mm.col}>
                <Text style={[m.label, { color: mutedColor }]}>Iniciales</Text>
                <TextInput
                  style={[m.input, { color: textColor, borderColor }]}
                  value={value.initials}
                  onChangeText={(initials) => onChange({ ...value, initials: initials.toUpperCase().slice(0, 3) })}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              <View style={mm.col}>
                <Text style={[m.label, { color: mutedColor }]}>Rol</Text>
                <View style={mm.roleRow}>
                  {(['member', 'admin'] as const).map((role) => {
                    const active = value.role === role;
                    return (
                      <Pressable
                        key={role}
                        style={[
                          mm.roleChip,
                          {
                            backgroundColor: active ? PRIMARY : 'transparent',
                            borderColor: active ? PRIMARY : borderColor,
                            opacity: canEditRole ? 1 : role === value.role ? 1 : 0.45,
                          },
                        ]}
                        disabled={!canEditRole}
                        onPress={() => onChange({ ...value, role })}
                      >
                        <Text style={[mm.roleChipText, { color: active ? '#fff' : mutedColor }]}>
                          {role === 'admin' ? 'Admin' : 'Miembro'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <Text style={[m.label, { color: mutedColor }]}>Color</Text>
            <View style={m.colorRow}>
              {GROUP_COLORS.map((color) => {
                const selected = value.color === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => onChange({ ...value, color })}
                    style={[
                      m.colorDot,
                      { backgroundColor: color, borderColor: selected ? textColor : 'transparent' },
                    ]}
                  >
                    {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>

            {canRemove && (
              <Pressable style={[mm.removeBtn, { borderColor }]} onPress={onRemove}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={mm.removeBtnText}>Quitar del grupo</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();
  const {
    families,
    currentFamily,
    familyId,
    isCurrentFamilyAdmin,
    isLoading,
    error,
    selectFamily,
    createGroup,
    updateGroup,
    deleteCurrentGroup,
    joinGroup,
    regenerateInviteCode,
    updateGroupMember,
    removeGroupMember,
    leaveCurrentGroup,
  } = useEvents();

  const bg = isDark ? '#111827' : '#F2F2F7';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const mutedColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);
  const [confirmLeaveGroup, setConfirmLeaveGroup] = useState(false);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState<GroupFormState>({
    name: '',
    description: '',
    color: GROUP_COLORS[0],
  });
  const [inviteCode, setInviteCode] = useState('');
  const [selectedMember, setSelectedMember] = useState<ApiFamilyMemberRow | null>(null);
  const [memberForm, setMemberForm] = useState<MemberFormState>({
    displayName: '',
    initials: '',
    color: GROUP_COLORS[0],
    role: 'member',
  });

  const isCurrentGroupCreator = currentFamily?.created_by_id === user?.id;
  const currentUserMembership = useMemo(
    () => currentFamily?.members?.find((member) => member.user_id === user?.id) ?? null,
    [currentFamily, user]
  );

  const openCreateModal = () => {
    setScreenError(null);
    setEditingGroup(false);
    setGroupForm({
      name: '',
      description: '',
      color: GROUP_COLORS[0],
    });
    setGroupModalOpen(true);
  };

  const openEditModal = () => {
    if (!currentFamily) return;
    setScreenError(null);
    setEditingGroup(true);
    setGroupForm({
      name: currentFamily.name,
      description: currentFamily.description ?? '',
      color: currentFamily.color || GROUP_COLORS[0],
    });
    setGroupModalOpen(true);
  };

  const openMemberModal = (member: ApiFamilyMemberRow) => {
    if (!isCurrentFamilyAdmin) return;
    setSelectedMember(member);
    setMemberForm({
      displayName: member.display_name || member.email.split('@')[0],
      initials: member.initials || initialsFromName(member.display_name, member.email),
      color: member.color || GROUP_COLORS[0],
      role: member.role,
    });
    setScreenError(null);
    setMemberModalOpen(true);
  };

  const handleCreateOrUpdateGroup = async () => {
    if (!groupForm.name.trim()) {
      setScreenError('El nombre del grupo es obligatorio.');
      return;
    }
    setBusy(true);
    setScreenError(null);
    try {
      if (editingGroup) {
        await updateGroup({
          name: groupForm.name.trim(),
          description: groupForm.description.trim(),
          color: groupForm.color,
        });
      } else {
        await createGroup({
          name: groupForm.name.trim(),
          description: groupForm.description.trim(),
          color: groupForm.color,
        });
      }
      setGroupModalOpen(false);
    } catch (event) {
      setScreenError(event instanceof Error ? event.message : 'No se pudo guardar el grupo');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      setScreenError('Introduce un codigo de invitacion.');
      return;
    }
    setBusy(true);
    setScreenError(null);
    try {
      await joinGroup(inviteCode.trim());
      setJoinModalOpen(false);
      setInviteCode('');
    } catch (event) {
      setScreenError(event instanceof Error ? event.message : 'No se pudo unir al grupo');
    } finally {
      setBusy(false);
    }
  };

  const handleShareInvite = async () => {
    if (!currentFamily?.invite_code) return;
    await Share.share({
      message: `Unete a mi grupo "${currentFamily.name}" en FamSync con este codigo: ${currentFamily.invite_code}`,
    });
  };

  const handleRegenerateInvite = async () => {
    setBusy(true);
    setScreenError(null);
    try {
      await regenerateInviteCode();
    } catch (event) {
      setScreenError(event instanceof Error ? event.message : 'No se pudo regenerar el codigo');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveMember = async () => {
    if (!selectedMember) return;
    setBusy(true);
    setScreenError(null);
    try {
      await updateGroupMember(selectedMember.id, {
        display_name: memberForm.displayName.trim(),
        initials: memberForm.initials.trim().toUpperCase().slice(0, 3),
        color: memberForm.color,
        role: memberForm.role,
      });
      setMemberModalOpen(false);
      setSelectedMember(null);
    } catch (event) {
      setScreenError(event instanceof Error ? event.message : 'No se pudo guardar el miembro');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    setBusy(true);
    setScreenError(null);
    try {
      await removeGroupMember(selectedMember.id);
      setConfirmRemoveMember(false);
      setMemberModalOpen(false);
      setSelectedMember(null);
    } catch (event) {
      setScreenError(event instanceof Error ? event.message : 'No se pudo quitar al miembro');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteGroup = async () => {
    setBusy(true);
    setScreenError(null);
    try {
      await deleteCurrentGroup();
      setConfirmDeleteGroup(false);
    } catch (event) {
      setScreenError(event instanceof Error ? event.message : 'No se pudo eliminar el grupo');
    } finally {
      setBusy(false);
    }
  };

  const handleLeaveGroup = async () => {
    setBusy(true);
    setScreenError(null);
    try {
      await leaveCurrentGroup();
      setConfirmLeaveGroup(false);
    } catch (event) {
      setScreenError(event instanceof Error ? event.message : 'No se pudo salir del grupo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <GroupModal
        visible={groupModalOpen}
        title={editingGroup ? 'Editar grupo' : 'Crear grupo'}
        submitLabel={editingGroup ? 'Guardar' : 'Crear'}
        value={groupForm}
        onChange={setGroupForm}
        onClose={() => setGroupModalOpen(false)}
        onSubmit={handleCreateOrUpdateGroup}
        busy={busy}
        cardBg={cardBg}
        textColor={textColor}
        mutedColor={mutedColor}
        borderColor={borderColor}
      />

      <JoinGroupModal
        visible={joinModalOpen}
        inviteCode={inviteCode}
        onChange={setInviteCode}
        onClose={() => setJoinModalOpen(false)}
        onSubmit={handleJoinGroup}
        busy={busy}
        cardBg={cardBg}
        textColor={textColor}
        mutedColor={mutedColor}
        borderColor={borderColor}
      />

      <InviteModal
        visible={inviteModalOpen}
        groupName={currentFamily?.name ?? 'tu grupo'}
        inviteCode={currentFamily?.invite_code ?? ''}
        canRegenerate={isCurrentFamilyAdmin}
        busy={busy}
        onShare={handleShareInvite}
        onRegenerate={handleRegenerateInvite}
        onClose={() => setInviteModalOpen(false)}
        cardBg={cardBg}
        textColor={textColor}
        mutedColor={mutedColor}
        borderColor={borderColor}
      />

      <MemberModal
        visible={memberModalOpen}
        member={selectedMember}
        value={memberForm}
        canEditRole={selectedMember?.user_id !== user?.id}
        canRemove={selectedMember?.user_id !== user?.id}
        busy={busy}
        onChange={setMemberForm}
        onSubmit={handleSaveMember}
        onRemove={() => setConfirmRemoveMember(true)}
        onClose={() => setMemberModalOpen(false)}
        cardBg={cardBg}
        textColor={textColor}
        mutedColor={mutedColor}
        borderColor={borderColor}
      />

      <ConfirmModal
        visible={confirmDeleteGroup}
        title="Eliminar grupo"
        message="Esta accion eliminara el grupo para todos sus miembros."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        danger
        icon="trash-outline"
        onConfirm={handleDeleteGroup}
        onCancel={() => setConfirmDeleteGroup(false)}
      />

      <ConfirmModal
        visible={confirmLeaveGroup}
        title="Salir del grupo"
        message="Dejaras de ver sus miembros y eventos."
        confirmLabel="Salir"
        cancelLabel="Cancelar"
        danger
        icon="log-out-outline"
        onConfirm={handleLeaveGroup}
        onCancel={() => setConfirmLeaveGroup(false)}
      />

      <ConfirmModal
        visible={confirmRemoveMember}
        title="Quitar miembro"
        message="Esta persona dejara de formar parte del grupo."
        confirmLabel="Quitar"
        cancelLabel="Cancelar"
        danger
        icon="person-remove-outline"
        onConfirm={handleRemoveMember}
        onCancel={() => setConfirmRemoveMember(false)}
      />

      <View style={[s.screen, { backgroundColor: bg }]}>
        <View style={[s.header, { paddingTop: insets.top + 12, backgroundColor: cardBg, borderBottomColor: borderColor }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={textColor} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: textColor }]}>Grupos</Text>
            <Text style={[s.headerSub, { color: mutedColor }]}>Crea, edita e invita miembros</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 36 }]}
        >
          {(screenError || error) && (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={s.errorText}>{screenError || error}</Text>
            </View>
          )}

          <View style={[s.heroCard, { backgroundColor: cardBg }]}>
            <View style={s.heroTop}>
              <View style={[s.groupColor, { backgroundColor: currentFamily?.color || PRIMARY }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.groupName, { color: textColor }]}>
                  {currentFamily?.name || 'Sin grupo activo'}
                </Text>
                <Text style={[s.groupMeta, { color: mutedColor }]}>
                  {currentFamily
                    ? `${currentFamily.members?.length ?? 0} miembros`
                    : 'Crea un grupo o unete con un codigo'}
                </Text>
              </View>
              {isLoading && <ActivityIndicator size="small" color={PRIMARY} />}
            </View>

            {currentFamily?.description ? (
              <Text style={[s.description, { color: mutedColor }]}>{currentFamily.description}</Text>
            ) : null}

            <View style={s.actionRow}>
              <Pressable style={s.primaryAction} onPress={currentFamily ? openEditModal : openCreateModal}>
                <Ionicons
                  name={currentFamily ? 'create-outline' : 'add-circle-outline'}
                  size={16}
                  color="#fff"
                />
                <Text style={s.primaryActionText}>{currentFamily ? 'Editar grupo' : 'Crear grupo'}</Text>
              </Pressable>

              <Pressable
                style={[s.secondaryAction, { borderColor }]}
                onPress={() => (currentFamily ? setInviteModalOpen(true) : setJoinModalOpen(true))}
              >
                <Ionicons
                  name={currentFamily ? 'person-add-outline' : 'log-in-outline'}
                  size={16}
                  color={PRIMARY}
                />
                <Text style={s.secondaryActionText}>
                  {currentFamily ? 'Invitar' : 'Unirme'}
                </Text>
              </Pressable>
            </View>

            {currentFamily && (
              <View style={[s.footerActions, { borderTopColor: borderColor }]}>
                <Pressable onPress={() => setJoinModalOpen(true)} style={s.footerAction}>
                  <Ionicons name="add-outline" size={15} color={mutedColor} />
                  <Text style={[s.footerActionText, { color: mutedColor }]}>Unirme a otro grupo</Text>
                </Pressable>

                {isCurrentGroupCreator ? (
                  <Pressable onPress={() => setConfirmDeleteGroup(true)} style={s.footerAction}>
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    <Text style={[s.footerActionText, { color: '#EF4444' }]}>Eliminar grupo</Text>
                  </Pressable>
                ) : currentUserMembership ? (
                  <Pressable onPress={() => setConfirmLeaveGroup(true)} style={s.footerAction}>
                    <Ionicons name="exit-outline" size={15} color="#EF4444" />
                    <Text style={[s.footerActionText, { color: '#EF4444' }]}>Salir del grupo</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>

          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: textColor }]}>Tus grupos</Text>
            <Pressable onPress={openCreateModal}>
              <Text style={[s.linkText, { color: PRIMARY }]}>Nuevo</Text>
            </Pressable>
          </View>

          <View style={[s.listCard, { backgroundColor: cardBg }]}>
            {families.map((family, index) => {
              const active = family.id === familyId;
              return (
                <View key={family.id}>
                  <Pressable
                    style={({ pressed }) => [
                      s.groupRow,
                      active && { backgroundColor: `${family.color || PRIMARY}14` },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => selectFamily(family.id)}
                  >
                    <View style={[s.smallColor, { backgroundColor: family.color || PRIMARY }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.groupRowTitle, { color: textColor }]}>{family.name}</Text>
                      <Text style={[s.groupRowMeta, { color: mutedColor }]}>
                        {family.members?.length ?? 0} miembros
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={18} color={PRIMARY} />}
                  </Pressable>
                  {index < families.length - 1 && (
                    <View style={[s.separator, { backgroundColor: borderColor, marginLeft: 46 }]} />
                  )}
                </View>
              );
            })}

            {families.length === 0 && (
              <View style={s.emptyState}>
                <Ionicons name="people-outline" size={28} color={mutedColor} />
                <Text style={[s.emptyStateText, { color: mutedColor }]}>
                  Aun no perteneces a ningun grupo.
                </Text>
              </View>
            )}
          </View>

          {currentFamily && (
            <>
              <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: textColor }]}>Miembros</Text>
                <Pressable onPress={() => setInviteModalOpen(true)}>
                  <Text style={[s.linkText, { color: PRIMARY }]}>Invitar</Text>
                </Pressable>
              </View>

              <View style={[s.listCard, { backgroundColor: cardBg }]}>
                {(currentFamily.members ?? []).map((member, index) => {
                  const isSelf = member.user_id === user?.id;
                  return (
                    <View key={member.id}>
                      <Pressable
                        style={({ pressed }) => [s.memberRow, pressed && isCurrentFamilyAdmin && { opacity: 0.75 }]}
                        onPress={() => openMemberModal(member)}
                        disabled={!isCurrentFamilyAdmin}
                      >
                        <View style={[s.memberAvatar, { backgroundColor: member.color || PRIMARY }]}>
                          <Text style={s.memberAvatarText}>{member.initials || '?'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.memberName, { color: textColor }]}>
                            {member.display_name || member.email.split('@')[0]}
                          </Text>
                          <Text style={[s.memberMeta, { color: mutedColor }]}>
                            {member.email}
                          </Text>
                        </View>
                        <View
                          style={[
                            s.rolePill,
                            { backgroundColor: member.role === 'admin' ? `${PRIMARY}18` : `${mutedColor}14` },
                          ]}
                        >
                          <Text
                            style={[
                              s.rolePillText,
                              { color: member.role === 'admin' ? PRIMARY : mutedColor },
                            ]}
                          >
                            {isSelf ? 'Tú' : member.role === 'admin' ? 'Admin' : 'Miembro'}
                          </Text>
                        </View>
                      </Pressable>
                      {index < (currentFamily.members?.length ?? 0) - 1 && (
                        <View style={[s.separator, { backgroundColor: borderColor, marginLeft: 58 }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'flex-end',
  },
  centerCard: {
    margin: 24,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  action: {
    fontSize: 16,
  },
  body: {
    padding: 20,
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const gm = StyleSheet.create({
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  codeBox: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  code: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
  },
  secondaryBtnText: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
});

const mm = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  col: {
    flex: 1,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
});

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 18,
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
  heroCard: {
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupColor: {
    width: 16,
    height: 56,
    borderRadius: 10,
  },
  groupName: {
    fontSize: 22,
    fontWeight: '800',
  },
  groupMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
  },
  secondaryActionText: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  smallColor: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  groupRowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  groupRowMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  emptyStateText: {
    fontSize: 13,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  memberMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  rolePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
