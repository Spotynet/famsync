import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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

import { ConfirmModal } from '../../components/ui/confirm-modal';
import { useAuth } from '../../contexts/AuthContext';
import { useEvents } from '../../contexts/EventsContext';
import { useColorScheme } from '../../hooks/use-color-scheme';
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  GOOGLE_CALENDAR_OAUTH_RETURN_URL,
} from '../../lib/api';
import { offsetDate } from '../../lib/mockData';

const PRIMARY = '#22C55E';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Fade-in hook ─────────────────────────────────────────────────────────────

function useFadeIn(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, tension: 80, friction: 10 }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
}

// ─── Weekly stats ──────────────────────────────────────────────────────────────

function useWeekStats() {
  const { events, members } = useEvents();
  const weekDates = Array.from({ length: 7 }, (_, i) => offsetDate(i - 3));
  const weekEvents = events.filter((e) => weekDates.includes(e.date));
  const conflicts  = weekEvents.filter((e) => e.priority === 'high').length;
  return { total: weekEvents.length, conflicts, members: members.length };
}

// ─── Hero banner ──────────────────────────────────────────────────────────────

function HeroBanner({
  displayName, email, isDark, textColor, mutedColor, onEditName,
}: {
  displayName: string; email: string; isDark: boolean;
  textColor: string; mutedColor: string; onEditName: () => void;
}) {
  const stats  = useWeekStats();
  const initial = displayName.charAt(0).toUpperCase();
  const anim   = useFadeIn(0);

  return (
    <Animated.View style={[hero.wrap, anim]}>
      {/* Background strip */}
      <View style={[hero.strip, { backgroundColor: isDark ? '#14532D' : '#DCFCE7' }]}>
        <View style={[hero.blob1, { backgroundColor: `${PRIMARY}28` }]} />
        <View style={[hero.blob2, { backgroundColor: `${PRIMARY}14` }]} />
      </View>

      {/* Avatar */}
      <View style={hero.avatarWrap}>
        <View style={[hero.avatar, { backgroundColor: PRIMARY }]}>
          <Text style={hero.avatarText}>{initial}</Text>
        </View>
        <Pressable style={hero.cameraBtn}>
          <Ionicons name="camera" size={13} color="#fff" />
        </Pressable>
      </View>

      {/* Name */}
      <Pressable onPress={onEditName} style={hero.nameRow}>
        <Text style={[hero.name, { color: textColor }]}>{displayName}</Text>
        <Ionicons name="pencil" size={14} color={mutedColor} />
      </Pressable>

      {/* Email + verified */}
      <View style={hero.emailRow}>
        <Text style={[hero.email, { color: mutedColor }]}>{email}</Text>
        <View style={[hero.verifiedPill, { backgroundColor: `${PRIMARY}18` }]}>
          <Ionicons name="checkmark-circle" size={12} color={PRIMARY} />
          <Text style={[hero.verifiedText, { color: PRIMARY }]}>Verificado</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={[hero.statsRow, { backgroundColor: isDark ? '#1F2937' : '#fff' }]}>
        {[
          { num: stats.total,   label: 'Eventos\nsemana',   color: textColor },
          { num: stats.members, label: 'Familiares',        color: textColor },
          { num: stats.conflicts, label: 'Conflictos',      color: stats.conflicts > 0 ? '#EF4444' : textColor },
        ].map((s, i, arr) => (
          <View key={i} style={hero.statGroup}>
            <View style={hero.statItem}>
              <Text style={[hero.statNum, { color: s.color }]}>{s.num}</Text>
              <Text style={[hero.statLabel, { color: mutedColor }]}>{s.label}</Text>
            </View>
            {i < arr.length - 1 && (
              <View style={[hero.statDiv, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const hero = StyleSheet.create({
  wrap:       { alignItems: 'center', marginBottom: 28 },
  strip:      { position: 'absolute', top: 0, left: -24, right: -24, height: 100, overflow: 'hidden' },
  blob1:      { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -80, right: -40 },
  blob2:      { position: 'absolute', width: 140, height: 140, borderRadius: 70,  top: -40, left: 10  },
  avatarWrap: { position: 'relative', marginTop: 36, marginBottom: 14 },
  avatar: {
    width: 92, height: 92, borderRadius: 46,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#fff',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32, shadowRadius: 12, elevation: 8,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#374151',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
  },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  name:       { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  emailRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 },
  email:      { fontSize: 13 },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  verifiedText: { fontSize: 11, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    alignSelf: 'stretch',
  },
  statGroup: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  statItem:  { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statNum:   { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 13 },
  statDiv:   { width: StyleSheet.hairlineWidth, marginVertical: 14 },
});

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ text, color }: { text: string; color: string }) {
  return <Text style={[sl.label, { color }]}>{text}</Text>;
}
const sl = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.0, marginBottom: 8, marginLeft: 2 },
});

// ─── Google Calendar card ──────────────────────────────────────────────────────

function formatSyncLabel(iso: string | null): string {
  if (!iso) return 'Aún no sincronizado';
  try {
    const d = new Date(iso);
    return `Última sync: ${d.toLocaleString()}`;
  } catch {
    return 'Última sync desconocida';
  }
}

function GoogleCalendarCard({
  cardBg, textColor, mutedColor, borderColor, isDark,
}: { cardBg: string; textColor: string; mutedColor: string; borderColor: string; isDark: boolean }) {
  const { isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const anim = useFadeIn(80);

  const refreshStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setConnected(false);
      setLastSyncAt(null);
      setStatusLoading(false);
      return;
    }
    try {
      const s = await getGoogleCalendarStatus();
      setConnected(s.connected);
      setLastSyncAt(s.last_sync_at);
    } catch {
      setConnected(false);
      setLastSyncAt(null);
    } finally {
      setStatusLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      refreshStatus();
    }, [refreshStatus])
  );

  const handlePress = async () => {
    if (!isAuthenticated) {
      setErrorMsg('Inicia sesión para conectar Google Calendar.');
      return;
    }
    if (connected) return;

    setErrorMsg(null);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 8 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 8 }),
    ]).start();

    setLoading(true);
    try {
      const authUrl = await connectGoogleCalendar();
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        GOOGLE_CALENDAR_OAUTH_RETURN_URL
      );
      if (result.type === 'success') {
        const s = await getGoogleCalendarStatus();
        setConnected(s.connected);
        setLastSyncAt(s.last_sync_at);
      }
      // 'cancel' = user closed the browser; no feedback needed
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'No se pudo conectar con Google Calendar.');
    } finally {
      setLoading(false);
    }
  };

  const doDisconnect = async () => {
    setShowDisconnectModal(false);
    setErrorMsg(null);
    setLoading(true);
    try {
      await disconnectGoogleCalendar();
      setConnected(false);
      setLastSyncAt(null);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'No se pudo desconectar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[gc.wrap, anim]}>
      <ConfirmModal
        visible={showDisconnectModal}
        title="Desconectar Calendar"
        message="¿Quitar la sincronización con Google Calendar? Los eventos importados permanecerán."
        confirmLabel="Desconectar"
        cancelLabel="Cancelar"
        danger
        icon="unlink"
        onConfirm={doDisconnect}
        onCancel={() => setShowDisconnectModal(false)}
      />

      <SectionLabel text="INTEGRACIONES" color={mutedColor} />
      <Animated.View style={[gc.card, { backgroundColor: cardBg, transform: [{ scale: scaleAnim }] }]}>
        {/* Left accent bar */}
        <View style={[gc.accent, { backgroundColor: connected ? PRIMARY : 'transparent' }]} />

        <View style={gc.inner}>
          {/* Icon */}
          <View style={[gc.iconWrap, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}>
            <Ionicons name="logo-google" size={22} color="#4285F4" />
          </View>

          {/* Text */}
          <View style={gc.textCol}>
            <Text style={[gc.title, { color: textColor }]}>Google Calendar</Text>
            <Text style={[gc.sub, { color: mutedColor }]}>
              {statusLoading
                ? 'Comprobando estado…'
                : connected
                  ? 'Sincronizando eventos'
                  : 'Conecta tu cuenta de Google'}
            </Text>
          </View>

          {/* Button */}
          <Pressable
            style={[
              gc.btn,
              connected
                ? { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderWidth: 1, borderColor }
                : { backgroundColor: '#4285F4' },
            ]}
            onPress={handlePress}
            disabled={loading || connected || statusLoading}
          >
            {loading ? (
              <ActivityIndicator color={connected ? PRIMARY : '#fff'} size="small" />
            ) : connected ? (
              <View style={gc.connectedRow}>
                <View style={[gc.dot, { backgroundColor: PRIMARY }]} />
                <Text style={[gc.btnText, { color: PRIMARY }]}>Activo</Text>
              </View>
            ) : (
              <Text style={[gc.btnText, { color: '#fff' }]}>Conectar</Text>
            )}
          </Pressable>
        </View>

        {/* Inline error */}
        {errorMsg && (
          <View style={[gc.errorRow, { borderTopColor: borderColor }]}>
            <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
            <Text style={gc.errorText}>{errorMsg}</Text>
            <Pressable onPress={() => setErrorMsg(null)} hitSlop={8}>
              <Ionicons name="close" size={13} color="#EF4444" />
            </Pressable>
          </View>
        )}

        {/* Connected detail row */}
        {connected && (
          <View style={[gc.detailRow, { borderTopColor: borderColor }]}>
            <Ionicons name="sync" size={12} color={PRIMARY} />
            <Text style={[gc.detailText, { color: mutedColor }]} numberOfLines={2}>
              {formatSyncLabel(lastSyncAt)}
            </Text>
            <Pressable onPress={() => setShowDisconnectModal(true)} disabled={loading}>
              <Text style={[gc.detailAction, { color: '#EF4444' }]}>Desconectar</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const gc = StyleSheet.create({
  wrap:  { marginBottom: 28 },
  card: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  accent: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, borderRadius: 2 },
  inner:  { flexDirection: 'row', alignItems: 'center', padding: 14, paddingLeft: 18, gap: 12 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  textCol: { flex: 1 },
  title:   { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sub:     { fontSize: 12, lineHeight: 16 },
  btn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:     { width: 7, height: 7, borderRadius: 4 },
  btnText: { fontSize: 13, fontWeight: '700' },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailText:   { flex: 1, fontSize: 11 },
  detailAction: { fontSize: 12, fontWeight: '700' },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#FEF2F2',
  },
  errorText: { flex: 1, fontSize: 12, color: '#EF4444', fontWeight: '500' },
});

// ─── Family members card ───────────────────────────────────────────────────────

function roleLabel(m: { role?: 'admin' | 'member' }): string {
  return m.role === 'admin' ? 'Administrador' : 'Miembro';
}

function FamilyCard({
  cardBg, textColor, mutedColor, borderColor,
}: { cardBg: string; textColor: string; mutedColor: string; borderColor: string }) {
  const { currentFamily, members } = useEvents();
  const anim = useFadeIn(120);

  return (
    <Animated.View style={[{ marginBottom: 28 }, anim]}>
      <SectionLabel text="MI FAMILIA" color={mutedColor} />
      <View style={[card.wrap, { backgroundColor: cardBg }]}>
        {currentFamily ? (
          <>
            <View style={card.header}>
              <View style={card.headerInfo}>
                <View style={[card.familyDot, { backgroundColor: currentFamily.color || PRIMARY }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[card.familyName, { color: textColor }]}>{currentFamily.name}</Text>
                  {!!currentFamily.description && (
                    <Text style={[card.familyDesc, { color: mutedColor }]} numberOfLines={2}>
                      {currentFamily.description}
                    </Text>
                  )}
                </View>
              </View>
              <Pressable onPress={() => router.push('/groups')} hitSlop={10}>
                <Text style={[card.manageLink, { color: PRIMARY }]}>Gestionar</Text>
              </Pressable>
            </View>

            <View style={[card.div, { backgroundColor: borderColor }]} />
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [card.emptyWrap, pressed && card.rowPressed]}
            onPress={() => router.push('/groups')}
          >
            <View style={[card.addCircle, { borderColor }]}>
              <Ionicons name="people-outline" size={18} color={mutedColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[card.name, { color: textColor }]}>Sin grupo activo</Text>
              <Text style={[card.role, { color: mutedColor }]}>
                Crea un grupo o unete con un codigo.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={mutedColor} />
          </Pressable>
        )}

        {(currentFamily ? members : []).map((m, i) => {
          const rl = roleLabel(m);
          return (
          <View key={m.id}>
            <Pressable style={({ pressed }) => [card.row, pressed && card.rowPressed]}>
              <View style={[card.avatar, { backgroundColor: m.color }]}>
                <Text style={card.avatarText}>{m.initials}</Text>
              </View>
              <View style={card.info}>
                <Text style={[card.name, { color: textColor }]}>{m.name}</Text>
                <Text style={[card.role, { color: mutedColor }]}>{rl}</Text>
              </View>
              <View style={[card.pill, {
                backgroundColor: rl === 'Administrador' ? `${PRIMARY}18` : `${mutedColor}14`,
              }]}>
                <Text style={[card.pillText, {
                  color: rl === 'Administrador' ? PRIMARY : mutedColor,
                }]}>{rl}</Text>
              </View>
            </Pressable>
            {i < members.length - 1 && (
              <View style={[card.div, { backgroundColor: borderColor, marginLeft: 70 }]} />
            )}
          </View>
          );
        })}

        <View style={[card.div, { backgroundColor: borderColor }]} />
        <Pressable
          style={({ pressed }) => [card.row, pressed && card.rowPressed]}
          onPress={() => router.push('/groups')}
        >
          <View style={[card.addCircle, { borderColor }]}>
            <Ionicons name={currentFamily ? 'settings-outline' : 'add'} size={18} color={mutedColor} />
          </View>
          <Text style={[card.addLabel, { color: mutedColor }]}>
            {currentFamily ? 'Gestionar grupo e invitaciones' : 'Crear o unirme a un grupo'}
          </Text>
          <Ionicons name="chevron-forward" size={15} color={mutedColor} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const card = StyleSheet.create({
  wrap: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row:        { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowPressed: { opacity: 0.7 },
  avatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  info:       { flex: 1 },
  name:       { fontSize: 15, fontWeight: '700' },
  role:       { fontSize: 12, marginTop: 2 },
  pill:       { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  pillText:   { fontSize: 11, fontWeight: '700' },
  div:        { height: StyleSheet.hairlineWidth },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, gap: 12 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  familyDot:  { width: 14, height: 40, borderRadius: 8 },
  familyName: { fontSize: 16, fontWeight: '800' },
  familyDesc: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  manageLink: { fontSize: 13, fontWeight: '700' },
  addCircle:  {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addLabel:   { flex: 1, fontSize: 14, fontWeight: '500' },
  emptyWrap:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
});

// ─── Settings group ────────────────────────────────────────────────────────────

type RowDef = {
  id: string; icon: IoniconsName; iconBg: string; iconColor: string;
  label: string; value?: string; toggle?: boolean; toggleValue?: boolean;
  onToggle?: (v: boolean) => void; danger?: boolean; badge?: string;
  onPress?: () => void;
};

function SettingsGroup({
  label, rows, cardBg, textColor, mutedColor, borderColor, delay = 0,
}: {
  label?: string; rows: RowDef[]; cardBg: string;
  textColor: string; mutedColor: string; borderColor: string; delay?: number;
}) {
  const anim = useFadeIn(delay);
  return (
    <Animated.View style={[{ marginBottom: 28 }, anim]}>
      {label && <SectionLabel text={label} color={mutedColor} />}
      <View style={[sg.card, { backgroundColor: cardBg }]}>
        {rows.map((row, i) => (
          <View key={row.id}>
            <Pressable
              style={({ pressed }) => [sg.row, pressed && !row.toggle && sg.rowPressed]}
              onPress={row.onPress}
            >
              <View style={[sg.iconBox, { backgroundColor: row.iconBg }]}>
                <Ionicons name={row.icon} size={17} color={row.iconColor} />
              </View>
              <Text style={[sg.label, { color: row.danger ? '#EF4444' : textColor }]}>{row.label}</Text>
              {row.badge && (
                <View style={sg.badge}><Text style={sg.badgeText}>{row.badge}</Text></View>
              )}
              {row.value && <Text style={[sg.value, { color: mutedColor }]}>{row.value}</Text>}
              {row.toggle !== undefined ? (
                <Switch
                  value={row.toggleValue}
                  onValueChange={row.onToggle}
                  trackColor={{ false: borderColor, true: PRIMARY }}
                  thumbColor="#fff"
                />
              ) : !row.danger ? (
                <Ionicons name="chevron-forward" size={15} color={mutedColor} />
              ) : null}
            </Pressable>
            {i < rows.length - 1 && (
              <View style={[sg.div, { backgroundColor: borderColor, marginLeft: 58 }]} />
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const sg = StyleSheet.create({
  card: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, gap: 12 },
  rowPressed: { opacity: 0.65 },
  iconBox:    { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label:      { flex: 1, fontSize: 15, fontWeight: '500' },
  value:      { fontSize: 13, marginRight: 2 },
  div:        { height: StyleSheet.hairlineWidth },
  badge:      { backgroundColor: '#EF4444', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginRight: 4 },
  badgeText:  { color: '#fff', fontSize: 11, fontWeight: '700' },
});

// ─── Famsync+ promo ────────────────────────────────────────────────────────────

function PromoCard({ delay = 0 }: { delay?: number }) {
  const anim = useFadeIn(delay);
  return (
    <Animated.View style={[{ marginBottom: 28 }, anim]}>
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
          <Text style={pr.pillText}>7 días gratis</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const pr = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1C1917', borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 14, elevation: 5,
  },
  leftCol: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sub:   { color: '#78716C', fontSize: 12, marginTop: 2 },
  pill:  { backgroundColor: PRIMARY, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  pillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

// ─── Edit name modal ───────────────────────────────────────────────────────────

function EditNameModal({
  visible, initial, onClose, onSave, cardBg, textColor, mutedColor, borderColor,
}: {
  visible: boolean; initial: string; onClose: () => void; onSave: (v: string) => void;
  cardBg: string; textColor: string; mutedColor: string; borderColor: string;
}) {
  const [val, setVal] = useState(initial);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={em.overlay} onPress={onClose}>
        <Pressable style={[em.sheet, { backgroundColor: cardBg }]} onPress={e => e.stopPropagation()}>
          <View style={[em.handle, { backgroundColor: borderColor }]} />
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
              Tu nombre es visible para todos los miembros de tu familia.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const em = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
  sheet:    { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: 40 },
  handle:   { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  header:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title:    { fontSize: 16, fontWeight: '700' },
  action:   { fontSize: 16 },
  input:    {
    fontSize: 17, borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
  },
  hint:     { fontSize: 13, lineHeight: 18 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated]);

  const isDark      = colorScheme === 'dark';
  const bg          = isDark ? '#111827' : '#F2F2F7';
  const cardBg      = isDark ? '#1F2937' : '#FFFFFF';
  const textColor   = isDark ? '#F9FAFB' : '#111827';
  const mutedColor  = isDark ? '#9CA3AF' : '#8E8E93';
  const borderColor = isDark ? '#374151' : '#E5E5EA';

  const [displayName, setDisplayName] = useState(
    user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'Usuario'
  );
  const [notifOn,      setNotifOn]      = useState(true);
  const [editName,     setEditName]     = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => setConfirmLogout(true);

  const accountRows: RowDef[] = [
    {
      id: 'name', icon: 'person', iconBg: `${PRIMARY}20`, iconColor: PRIMARY,
      label: 'Nombre y apellido', value: displayName.split(' ')[0],
      onPress: () => setEditName(true),
    },
    {
      id: 'notif', icon: 'notifications', iconBg: '#FEF3C720', iconColor: '#F59E0B',
      label: 'Notificaciones', toggle: true, toggleValue: notifOn, onToggle: setNotifOn,
    },
    {
      id: 'privacy', icon: 'lock-closed', iconBg: '#EFF6FF', iconColor: '#3B82F6',
      label: 'Privacidad',
    },
    {
      id: 'devices', icon: 'phone-portrait', iconBg: '#F5F3FF', iconColor: '#8B5CF6',
      label: 'Dispositivos', value: '1 activo',
    },
  ];

  const prefsRows: RowDef[] = [
    {
      id: 'appearance', icon: 'color-palette', iconBg: '#FFF0F6', iconColor: '#EC4899',
      label: 'Apariencia', value: isDark ? 'Oscuro' : 'Claro',
    },
    {
      id: 'language', icon: 'language', iconBg: `${PRIMARY}15`, iconColor: PRIMARY,
      label: 'Idioma', value: 'Español',
    },
    {
      id: 'calendar', icon: 'calendar', iconBg: '#EFF6FF', iconColor: '#3B82F6',
      label: 'Inicio de semana', value: 'Lunes',
    },
  ];

  const supportRows: RowDef[] = [
    {
      id: 'help', icon: 'help-circle', iconBg: '#FFF7ED', iconColor: '#F97316',
      label: 'Centro de ayuda',
    },
    {
      id: 'rate', icon: 'star', iconBg: '#FFFBEB', iconColor: '#F59E0B',
      label: 'Valorar FamSync', badge: '¡Nuevo!',
    },
    {
      id: 'share', icon: 'share-social', iconBg: `${PRIMARY}15`, iconColor: PRIMARY,
      label: 'Compartir con amigos',
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

      <ConfirmModal
        visible={confirmLogout}
        title="Cerrar sesión"
        message="¿Estás seguro de que quieres cerrar sesión?"
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        danger
        icon="log-out-outline"
        onConfirm={() => {
          setConfirmLogout(false);
          logout().catch(() => router.replace('/login'));
        }}
        onCancel={() => setConfirmLogout(false)}
      />

      <ScrollView
        style={[s.wrapper, { backgroundColor: bg }]}
        contentContainerStyle={[s.content, {
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <HeroBanner
          displayName={displayName}
          email={user?.email ?? ''}
          isDark={isDark}
          textColor={textColor}
          mutedColor={mutedColor}
          onEditName={() => setEditName(true)}
        />

        {/* Promo */}
        <PromoCard delay={40} />

        {/* Google Calendar */}
        <GoogleCalendarCard
          cardBg={cardBg}
          textColor={textColor}
          mutedColor={mutedColor}
          borderColor={borderColor}
          isDark={isDark}
        />

        {/* Family */}
        <FamilyCard
          cardBg={cardBg}
          textColor={textColor}
          mutedColor={mutedColor}
          borderColor={borderColor}
        />

        {/* Account */}
        <SettingsGroup
          label="CUENTA"
          rows={accountRows}
          cardBg={cardBg}
          textColor={textColor}
          mutedColor={mutedColor}
          borderColor={borderColor}
          delay={160}
        />

        {/* Preferences */}
        <SettingsGroup
          label="PREFERENCIAS"
          rows={prefsRows}
          cardBg={cardBg}
          textColor={textColor}
          mutedColor={mutedColor}
          borderColor={borderColor}
          delay={200}
        />

        {/* Support */}
        <SettingsGroup
          label="SOPORTE"
          rows={supportRows}
          cardBg={cardBg}
          textColor={textColor}
          mutedColor={mutedColor}
          borderColor={borderColor}
          delay={240}
        />

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.75 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </Pressable>

        {/* Version */}
        <Text style={[s.version, { color: mutedColor }]}>FamSync v1.0.0 · Hecho con ♥ para tu familia</Text>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1 },
  content: { paddingHorizontal: 20 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 18,
    backgroundColor: '#FEE2E2', marginBottom: 20,
  },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  version:    { fontSize: 12, textAlign: 'center', marginBottom: 8 },
});
