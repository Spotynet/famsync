import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { useEvents } from '../../contexts/EventsContext';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { MEMBERS, offsetDate, todayStr } from '../../lib/mockData';

const PRIMARY = '#22C55E';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Weekly stats ──────────────────────────────────────────────────────────────

function useWeekStats() {
  const { events } = useEvents();
  const today = todayStr();
  const weekDates = Array.from({ length: 7 }, (_, i) => offsetDate(i - 3));
  const weekEvents = events.filter((e) => weekDates.includes(e.date));
  const conflicts  = weekEvents.filter((e) => e.priority === 'high').length;
  return { total: weekEvents.length, conflicts, members: MEMBERS.length };
}

// ─── Hero banner ──────────────────────────────────────────────────────────────

function HeroBanner({
  displayName,
  email,
  isDark,
  textColor,
  mutedColor,
}: {
  displayName: string;
  email: string;
  isDark: boolean;
  textColor: string;
  mutedColor: string;
}) {
  const stats = useWeekStats();
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={hero.wrap}>
      {/* Background strip */}
      <View style={[hero.strip, { backgroundColor: isDark ? '#14532D' : '#DCFCE7' }]}>
        <View style={[hero.stripAccent, { backgroundColor: `${PRIMARY}30` }]} />
        <View style={[hero.stripAccent2, { backgroundColor: `${PRIMARY}18` }]} />
      </View>

      {/* Avatar */}
      <View style={hero.avatarWrap}>
        <View style={[hero.avatar, { backgroundColor: PRIMARY }]}>
          <Text style={hero.avatarText}>{initial}</Text>
        </View>
        <View style={hero.cameraBtn}>
          <Ionicons name="camera" size={13} color="#fff" />
        </View>
      </View>

      {/* Name & email */}
      <Text style={[hero.name, { color: textColor }]}>{displayName}</Text>
      <View style={hero.emailRow}>
        <Text style={[hero.email, { color: mutedColor }]}>{email}</Text>
        <View style={[hero.verifiedPill, { backgroundColor: `${PRIMARY}20` }]}>
          <Ionicons name="checkmark-circle" size={12} color={PRIMARY} />
          <Text style={[hero.verifiedText, { color: PRIMARY }]}>Verificado</Text>
        </View>
      </View>

      {/* Stats strip */}
      <View style={[hero.statsRow, { backgroundColor: isDark ? '#1F2937' : '#fff' }]}>
        <View style={hero.statItem}>
          <Text style={[hero.statNum, { color: textColor }]}>{stats.total}</Text>
          <Text style={[hero.statLabel, { color: mutedColor }]}>Eventos / semana</Text>
        </View>
        <View style={[hero.statDiv, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
        <View style={hero.statItem}>
          <Text style={[hero.statNum, { color: textColor }]}>{stats.members}</Text>
          <Text style={[hero.statLabel, { color: mutedColor }]}>Familiares</Text>
        </View>
        <View style={[hero.statDiv, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
        <View style={hero.statItem}>
          <Text style={[hero.statNum, { color: '#EF4444' }]}>{stats.conflicts}</Text>
          <Text style={[hero.statLabel, { color: mutedColor }]}>Conflictos</Text>
        </View>
      </View>
    </View>
  );
}

const hero = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 24 },
  strip: { position: 'absolute', top: 0, left: -20, right: -20, height: 90, overflow: 'hidden' },
  stripAccent: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    top: -60, right: -40,
  },
  stripAccent2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    top: -30, left: 20,
  },
  avatarWrap: { position: 'relative', marginTop: 28, marginBottom: 12 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#fff',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '800' },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#374151',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  name: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  email: { fontSize: 13 },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  verifiedText: { fontSize: 11, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    alignSelf: 'stretch', marginHorizontal: 0,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 3 },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  statDiv: { width: StyleSheet.hairlineWidth, marginVertical: 12 },
});

// ─── Family members card ───────────────────────────────────────────────────────

function FamilyCard({
  cardBg, textColor, mutedColor, borderColor, isDark,
}: { cardBg: string; textColor: string; mutedColor: string; borderColor: string; isDark: boolean }) {
  const ROLES: Record<string, string> = { m1: 'Administrador', m2: 'Administrador', m3: 'Miembro', m4: 'Miembro' };

  return (
    <View style={fc.wrap}>
      <Text style={[fc.sectionLabel, { color: mutedColor }]}>MI FAMILIA</Text>
      <View style={[fc.card, { backgroundColor: cardBg }]}>
        {MEMBERS.map((m, i) => (
          <View key={m.id}>
            <Pressable style={fc.row}>
              <View style={[fc.avatar, { backgroundColor: m.color }]}>
                <Text style={fc.avatarText}>{m.initials}</Text>
              </View>
              <View style={fc.info}>
                <Text style={[fc.name, { color: textColor }]}>{m.name}</Text>
                <Text style={[fc.role, { color: mutedColor }]}>{ROLES[m.id]}</Text>
              </View>
              <View style={[fc.rolePill, {
                backgroundColor: ROLES[m.id] === 'Administrador' ? `${PRIMARY}18` : `${mutedColor}18`,
              }]}>
                <Text style={[fc.rolePillText, {
                  color: ROLES[m.id] === 'Administrador' ? PRIMARY : mutedColor,
                }]}>{ROLES[m.id]}</Text>
              </View>
            </Pressable>
            {i < MEMBERS.length - 1 && <View style={[fc.div, { backgroundColor: borderColor, marginLeft: 70 }]} />}
          </View>
        ))}

        {/* Add member row */}
        <View style={[fc.div, { backgroundColor: borderColor }]} />
        <Pressable style={fc.row}>
          <View style={[fc.addCircle, { borderColor }]}>
            <Ionicons name="add" size={18} color={mutedColor} />
          </View>
          <Text style={[fc.addLabel, { color: mutedColor }]}>Invitar a un familiar</Text>
          <Ionicons name="chevron-forward" size={16} color={mutedColor} />
        </Pressable>
      </View>
    </View>
  );
}

const fc = StyleSheet.create({
  wrap: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  role: { fontSize: 12, marginTop: 1 },
  rolePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  rolePillText: { fontSize: 11, fontWeight: '700' },
  div: { height: StyleSheet.hairlineWidth },
  addCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
});

// ─── Settings group ────────────────────────────────────────────────────────────

type RowDef = {
  id: string;
  icon: IoniconsName;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
  badge?: string;
};

function SettingsGroup({
  label, rows, cardBg, textColor, mutedColor, borderColor,
}: {
  label?: string;
  rows: RowDef[];
  cardBg: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}) {
  return (
    <View style={sg.wrap}>
      {label && <Text style={[sg.label, { color: mutedColor }]}>{label}</Text>}
      <View style={[sg.card, { backgroundColor: cardBg }]}>
        {rows.map((row, i) => (
          <View key={row.id}>
            <Pressable style={sg.row} onPress={row.danger ? undefined : () => {}}>
              <View style={[sg.iconBox, { backgroundColor: row.iconBg }]}>
                <Ionicons name={row.icon} size={17} color={row.iconColor} />
              </View>
              <Text style={[sg.rowLabel, { color: row.danger ? '#EF4444' : textColor }]}>{row.label}</Text>
              {row.badge && (
                <View style={sg.badge}><Text style={sg.badgeText}>{row.badge}</Text></View>
              )}
              {row.value && <Text style={[sg.rowValue, { color: mutedColor }]}>{row.value}</Text>}
              {row.toggle !== undefined ? (
                <Switch
                  value={row.toggleValue}
                  onValueChange={row.onToggle}
                  trackColor={{ false: borderColor, true: PRIMARY }}
                  thumbColor="#fff"
                />
              ) : (
                !row.danger && <Ionicons name="chevron-forward" size={15} color={mutedColor} />
              )}
            </Pressable>
            {i < rows.length - 1 && (
              <View style={[sg.div, { backgroundColor: borderColor, marginLeft: 58 }]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const sg = StyleSheet.create({
  wrap: { marginBottom: 22 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, gap: 12 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 13, marginRight: 4 },
  div: { height: StyleSheet.hairlineWidth },
  badge: { backgroundColor: '#EF4444', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginRight: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

// ─── Edit name modal ───────────────────────────────────────────────────────────

function EditNameModal({
  visible, initial, onClose, onSave, cardBg, textColor, mutedColor, borderColor,
}: {
  visible: boolean;
  initial: string;
  onClose: () => void;
  onSave: (name: string) => void;
  cardBg: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}) {
  const [val, setVal] = useState(initial);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={em.overlay} onPress={onClose}>
        <Pressable style={[em.sheet, { backgroundColor: cardBg }]} onPress={(e) => e.stopPropagation()}>
          <View style={[em.header, { borderBottomColor: borderColor }]}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[em.action, { color: mutedColor }]}>Cancelar</Text>
            </Pressable>
            <Text style={[em.title, { color: textColor }]}>Tu nombre</Text>
            <Pressable onPress={() => { onSave(val); onClose(); }} hitSlop={12}>
              <Text style={[em.action, { color: PRIMARY, fontWeight: '700' }]}>Guardar</Text>
            </Pressable>
          </View>
          <View style={{ padding: 20 }}>
            <TextInput
              style={[em.input, { color: textColor, borderColor }]}
              value={val}
              onChangeText={setVal}
              placeholder="Tu nombre completo"
              placeholderTextColor={mutedColor}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => { onSave(val); onClose(); }}
            />
            <Text style={[em.hint, { color: mutedColor }]}>
              Tu nombre es visible para todos los miembros de la familia.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const em = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16, fontWeight: '700' },
  action: { fontSize: 16 },
  input: {
    fontSize: 17, borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
  },
  hint: { fontSize: 13, lineHeight: 18 },
});

// ─── Famsync+ promo card ───────────────────────────────────────────────────────

function PromoCard() {
  return (
    <Pressable style={pr.wrap}>
      <View style={pr.leftCol}>
        <View style={pr.iconWrap}>
          <Ionicons name="star" size={18} color="#F59E0B" />
        </View>
        <View>
          <Text style={pr.title}>Famsync<Text style={{ color: PRIMARY }}>+</Text></Text>
          <Text style={pr.sub}>Desbloquea todas las funciones</Text>
        </View>
      </View>
      <View style={pr.pill}>
        <Text style={pr.pillText}>Gratis 7 días</Text>
      </View>
    </Pressable>
  );
}

const pr = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1C1917', borderRadius: 18, padding: 16, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  leftCol: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sub: { color: '#78716C', fontSize: 12, marginTop: 1 },
  pill: { backgroundColor: PRIMARY, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated]);
  const isDark = colorScheme === 'dark';

  const bg          = isDark ? '#111827' : '#F2F2F7';
  const cardBg      = isDark ? '#1F2937' : '#FFFFFF';
  const textColor   = isDark ? '#F9FAFB' : '#111827';
  const mutedColor  = isDark ? '#9CA3AF' : '#8E8E93';
  const borderColor = isDark ? '#374151' : '#E5E5EA';

  const [displayName, setDisplayName] = useState(
    user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'Usuario'
  );
  const [notifOn, setNotifOn]   = useState(true);
  const [editName, setEditName] = useState(false);

  const handleLogout = () => {
    // En web Alert.alert no muestra diálogo; cerramos sesión directo.
    const doLogout = () => {
      logout().catch(() => router.replace('/'));
    };
    if (typeof window !== 'undefined') {
      if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        doLogout();
      }
    } else {
      Alert.alert(
        'Cerrar sesión',
        '¿Estás seguro de que quieres cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar sesión', style: 'destructive', onPress: doLogout },
        ]
      );
    }
  };

  const accountRows: RowDef[] = [
    {
      id: 'name',
      icon: 'person',
      iconBg: `${PRIMARY}20`,
      iconColor: PRIMARY,
      label: 'Nombre y apellido',
      value: displayName.split(' ')[0],
    },
    {
      id: 'notif',
      icon: 'notifications',
      iconBg: '#FEF3C720',
      iconColor: '#F59E0B',
      label: 'Notificaciones',
      toggle: true,
      toggleValue: notifOn,
      onToggle: setNotifOn,
    },
    {
      id: 'privacy',
      icon: 'lock-closed',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      label: 'Privacidad',
    },
    {
      id: 'devices',
      icon: 'phone-portrait',
      iconBg: '#F5F3FF',
      iconColor: '#8B5CF6',
      label: 'Dispositivos',
      value: '1 activo',
    },
  ];

  const prefsRows: RowDef[] = [
    {
      id: 'appearance',
      icon: 'color-palette',
      iconBg: '#FFF0F6',
      iconColor: '#EC4899',
      label: 'Apariencia',
      value: isDark ? 'Oscuro' : 'Claro',
    },
    {
      id: 'language',
      icon: 'language',
      iconBg: `${PRIMARY}15`,
      iconColor: PRIMARY,
      label: 'Idioma',
      value: 'Español',
    },
    {
      id: 'calendar',
      icon: 'calendar',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      label: 'Formato de semana',
      value: 'Lunes',
    },
  ];

  const supportRows: RowDef[] = [
    {
      id: 'help',
      icon: 'help-circle',
      iconBg: '#FFF7ED',
      iconColor: '#F97316',
      label: 'Centro de ayuda',
    },
    {
      id: 'rate',
      icon: 'star',
      iconBg: '#FFFBEB',
      iconColor: '#F59E0B',
      label: 'Valorar Famsync',
      badge: '¡Nuevo!',
    },
    {
      id: 'share',
      icon: 'share-social',
      iconBg: `${PRIMARY}15`,
      iconColor: PRIMARY,
      label: 'Compartir con amigos',
    },
  ];

  const dangerRows: RowDef[] = [
    {
      id: 'logout',
      icon: 'log-out',
      iconBg: '#FEE2E2',
      iconColor: '#EF4444',
      label: 'Cerrar sesión',
      danger: true,
    },
  ];

  return (
    <>
      <EditNameModal
        visible={editName}
        initial={displayName}
        onClose={() => setEditName(false)}
        onSave={setDisplayName}
        cardBg={cardBg}
        textColor={textColor}
        mutedColor={mutedColor}
        borderColor={borderColor}
      />

      <ScrollView
        style={[s.wrapper, { backgroundColor: bg }]}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 90, paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────── */}
        <HeroBanner
          displayName={displayName}
          email={user?.email ?? ''}
          isDark={isDark}
          textColor={textColor}
          mutedColor={mutedColor}
        />

        {/* ── Famsync+ promo ──────────────────────────── */}
        <PromoCard />

        {/* ── Family ──────────────────────────────────── */}
        <FamilyCard
          cardBg={cardBg}
          textColor={textColor}
          mutedColor={mutedColor}
          borderColor={borderColor}
          isDark={isDark}
        />

        {/* ── Account settings ────────────────────────── */}
        <SettingsGroup
          label="CUENTA"
          rows={accountRows}
          cardBg={cardBg}
          textColor={textColor}
          mutedColor={mutedColor}
          borderColor={borderColor}
        />

        {/* ── Preferences ─────────────────────────────── */}
        <SettingsGroup
          label="PREFERENCIAS"
          rows={prefsRows}
          cardBg={cardBg}
          textColor={textColor}
          mutedColor={mutedColor}
          borderColor={borderColor}
        />

        {/* ── Support ─────────────────────────────────── */}
        <SettingsGroup
          label="SOPORTE"
          rows={supportRows}
          cardBg={cardBg}
          textColor={textColor}
          mutedColor={mutedColor}
          borderColor={borderColor}
        />

        {/* ── Danger zone ─────────────────────────────── */}
        <Pressable
          style={[s.logoutBtn, { backgroundColor: '#FEE2E2' }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={18} color="#EF4444" />
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </Pressable>

        {/* ── Version ─────────────────────────────────── */}
        <View style={s.versionRow}>
          <Text style={[s.versionText, { color: mutedColor }]}>Famsync · versión 1.0.0</Text>
          <Text style={[s.versionText, { color: mutedColor }]}>Hecho con ♥ para tu familia</Text>
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1 },
  content: { paddingHorizontal: 20 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 18, marginBottom: 20,
  },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  versionRow: { alignItems: 'center', gap: 4, marginBottom: 8 },
  versionText: { fontSize: 12 },
});
