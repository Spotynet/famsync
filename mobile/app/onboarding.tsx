import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '../hooks/use-color-scheme';
import { setItem, SETUP_DONE_KEY } from '../lib/storage';

export const ONBOARDING_DONE_KEY = 'famsync_onboarding_done';

const PRIMARY = '#34C759';
const PALE_TEAL = '#9FD6CD';

// ─── Theme helpers ────────────────────────────────────────────────────────────

type Theme = {
  isDark: boolean;
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
};

function useTheme(): Theme {
  const scheme = useColorScheme() ?? 'light';
  const isDark  = scheme === 'dark';
  return {
    isDark,
    bg:     isDark ? '#111827' : '#FFFFFF',
    card:   isDark ? '#1F2937' : '#FFFFFF',
    text:   isDark ? '#F9FAFB' : '#111827',
    muted:  isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
  };
}

// ─── Per-slide accent config ──────────────────────────────────────────────────

type SlideAccent = {
  lightBg: string;
  darkBg: string;
  dot: string;
};

const ACCENTS: SlideAccent[] = [
  { lightBg: '#FFFFFF', darkBg: '#111827', dot: PRIMARY },
  { lightBg: '#FFFFFF', darkBg: '#111827', dot: PRIMARY },
  { lightBg: '#FFFFFF', darkBg: '#111827', dot: PRIMARY },
  { lightBg: '#FFFFFF', darkBg: '#111827', dot: PRIMARY },
  { lightBg: '#FFFFFF', darkBg: '#111827', dot: PRIMARY },
  { lightBg: '#FFFFFF', darkBg: '#111827', dot: PRIMARY },
  { lightBg: '#FFFFFF', darkBg: '#111827', dot: PRIMARY },
];

// ─── Slide 1 — Welcome logo ─────────────────────────────────────────────────
function WelcomeIllustration({ t }: { t: Theme }) {
  return (
    <View style={ill.welcomeOuter}>
      <Image
        source={require('../assets/images/famsync_logo.png')}
        style={ill.welcomeLogo}
        resizeMode="contain"
      />
      {!t.isDark && (
        <Text style={ill.welcomeName}>FamSync</Text>
      )}
      <Text style={[ill.welcomeDesc, { color: t.muted }]}>
        Tu familia en sintonía
      </Text>
    </View>
  );
}

// ─── Slide 2 — One Map ──────────────────────────────────────────────────────
// Fixed-size diagram always centered; title+subtitle embedded at the top.

const DW = 280;   // diagram container width
const DH = 220;   // diagram container height
const BS = 100;   // FamSync box size
const CS = 44;    // circle size
const BL = (DW - BS) / 2;          // box left  = 90
const BT = (DH - BS) / 2 - 10;    // box top   = 60
const BCX = BL + BS / 2;           // box center x = 140
const BCY = BT + BS / 2;           // box center y = 110

// Each node: top-left corner of the 44px circle, circle center = (x+22, y+22)
// Symmetric around BCX=140: DAD↔DAUGHTER, NANNY↔GRANDPA, DRIVER alone on left
const NODES = [
  { label: 'PAPÁ',    x: 30,  y: 5,   icon: '👨' },
  { label: 'HIJA',    x: 186, y: 5,   icon: '👩' },
  { label: 'CHOFER',  x: 8,   y: 83,  icon: '🚗' },
  { label: 'NANNY',   x: 62,  y: 172, icon: '👩‍⚕️' },
  { label: 'ABUELO',  x: 174, y: 172, icon: '👴' },
];

function DashLine({ x1, y1, x2, y2, color = '#CCCCCC' }: { x1: number; y1: number; x2: number; y2: number; color?: string }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <View
      style={{
        position: 'absolute',
        left: (x1 + x2) / 2 - len / 2,
        top: (y1 + y2) / 2,
        width: len,
        height: 1.5,
        borderTopWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: color,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

function OneMapIllustration({ t }: { t: Theme }) {
  return (
    <View style={ill.oneMapOuter}>
      {/* Title + description at top */}
      <View style={ill.oneMapTextBlock}>
        <Text style={[ill.oneMapTitle, { color: t.text }]}>
          {'Un Mapa para '}
          <Text style={{ color: PRIMARY }}>{'Todos'}</Text>
        </Text>
        <Text style={[ill.oneMapSubtitle, { color: t.muted }]}>
          Unifica los horarios de tu familia en un solo ecosistema fluido para todos.
        </Text>
      </View>

      {/* Diagram centered in remaining space */}
      <View style={ill.oneMapDiagramWrap}>
        <View style={{ width: DW, height: DH }}>
        {/* Dashed connection lines (behind circles) */}
        {NODES.map((n) => (
          <DashLine
            key={n.label}
            x1={BCX}  y1={BCY}
            x2={n.x + CS / 2}  y2={n.y + CS / 2}
          />
        ))}

        {/* FamSync center box */}
        <View style={[ill.oneMapCenter, { backgroundColor: PALE_TEAL, position: 'absolute', left: BL, top: BT }]}>
          <Ionicons name="people" size={28} color="rgba(0,0,0,0.18)" />
          <Image
            source={require('../assets/images/famsync_name.png')}
            style={ill.oneMapFamsyncImg}
            resizeMode="contain"
          />
        </View>

        {/* Person nodes with emoji/icon */}
        {NODES.map((n) => (
          <View key={n.label} style={[ill.oneMapCircle, { position: 'absolute', left: n.x, top: n.y }]}>
            <View style={ill.oneMapIconWrap}>
              <Text style={ill.oneMapEmoji}>{n.icon}</Text>
            </View>
            <Text style={ill.oneMapLabel}>{n.label}</Text>
          </View>
        ))}
        </View>
      </View>
    </View>
  );
}

// ─── Slide 3 — Elimina silos (premium diagram) ─────────────────────────────────
const SILOS_W = 260;
const SILOS_H = 220;
const SC_R = 58;
const SC_CX = SILOS_W / 2;
const SC_CY = SILOS_H / 2;
const CROSSED_NODES = [
  { icon: 'calendar-outline' as const, x: 12, y: 12 },
  { icon: 'document-outline' as const, x: SILOS_W - 52, y: 12 },
  { icon: 'chatbubble-outline' as const, x: 12, y: SILOS_H - 52 },
  { icon: 'pencil-outline' as const, x: SILOS_W - 52, y: SILOS_H - 52 },
];

function EliminaSilosIllustration({ t }: { t: Theme }) {
  const isDark = t.isDark;
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const cardBorder = isDark ? '#334155' : '#E5E7EB';
  const iconBg = isDark ? '#451A1A' : '#FEF2F2';

  return (
    <View style={ill.silosOuter}>
      <View style={ill.silosTextBlock}>
        <Text style={[ill.silosTitle, { color: t.text }]}>
          Elimina los silos de información y la carga mental
        </Text>
        <Text style={[ill.silosSubtitle, { color: t.muted }]}>
          Centraliza todo lo que tu familia necesita en un solo lugar. Adiós al caos de mensajes y notas perdidas.
        </Text>
      </View>

      <View style={ill.silosGraphicWrap}>
        <View style={{ width: SILOS_W, height: SILOS_H }}>
          {/* Dashed connector lines (behind cards) */}
          {CROSSED_NODES.map((n) => (
            <View key={`line-${n.icon}`} style={{ position: 'absolute', zIndex: 0 }}>
              <DashLine
                x1={SC_CX}
                y1={SC_CY}
                x2={n.x + 20}
                y2={n.y + 20}
                color={isDark ? '#475569' : '#D1D5DB'}
              />
            </View>
          ))}

          {/* 4 premium crossed cards at corners */}
          {CROSSED_NODES.map((n, i) => (
            <View key={i} style={[ill.silosCrossedCard, { left: n.x, top: n.y, backgroundColor: cardBg, borderColor: cardBorder, zIndex: 1 }]}>
              <View style={[ill.silosCrossedIconBg, { backgroundColor: iconBg }]}>
                <Ionicons name={n.icon} size={18} color="#EF4444" />
              </View>
              <View style={ill.silosCrossedX}>
                <Text style={ill.silosX}>✕</Text>
              </View>
            </View>
          ))}

          {/* Central circle — premium: outer ring + shadow + inner content */}
          <View style={[ill.silosGreenCircleOuter, { zIndex: 2 }]}>
            <View style={ill.silosGreenCircle}>
              <View style={ill.silosBulbWrap}>
                <Ionicons name="bulb" size={32} color="#fff" />
                <Text style={ill.silosXOverlay}>✕</Text>
              </View>
              <Text style={ill.silosMente}>MENTE SATURADA</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Slide 4 — Del caos a la sintonía (Antes/Después) ─────────────────────────
function DelCaosIllustration({ t }: { t: Theme }) {
  const textColor = t.isDark ? '#D1D5DB' : '#374151';
  return (
    <View style={ill.caosOuter}>
      <View style={ill.caosCol}>
        <View style={[ill.caosCircle, { backgroundColor: t.isDark ? '#2D1B4E' : '#E9D5FF' }]}>
          <Text style={ill.caosEmoji}>😔</Text>
        </View>
        <View style={[ill.caosBubble, { borderColor: t.border }]}>
          <Text style={[ill.caosBubbleText, { color: textColor }]}>Se me olvidó...</Text>
        </View>
        <View style={[ill.caosBubble, { borderColor: t.border }]}>
          <Text style={[ill.caosBubbleText, { color: textColor }]}>No sabía</Text>
        </View>
        <View style={[ill.caosBubble, { borderColor: t.border }]}>
          <Text style={[ill.caosBubbleText, { color: textColor }]}>¿Quién lo hace?</Text>
        </View>
        <Text style={[ill.caosLabel, { color: textColor }]}>CAOS TOTAL</Text>
      </View>
      <View style={ill.caosCol}>
        <View style={[ill.caosCircle, { backgroundColor: t.isDark ? '#3B3A00' : '#FEF08A' }]}>
          <Text style={ill.caosEmoji}>😊</Text>
        </View>
        <View style={[ill.caosBubble, { borderColor: '#86EFAC' }]}>
          <Text style={[ill.caosBubbleText, { color: textColor }]}>Vida estructurada</Text>
        </View>
        <View style={[ill.caosBubble, { borderColor: '#86EFAC' }]}>
          <Text style={[ill.caosBubbleText, { color: textColor }]}>Decisiones inmediatas</Text>
        </View>
        <View style={[ill.caosBubble, { borderColor: '#86EFAC' }]}>
          <Text style={[ill.caosBubbleText, { color: textColor }]}>Paz mental</Text>
        </View>
        <Text style={[ill.caosLabel, { color: PRIMARY }]}>SINTONÍA</Text>
      </View>
    </View>
  );
}

// ─── Slide 5 — Por qué FamSync (premium feature list) ─────────────────────────
function PorQueFamSyncIllustration({ t }: { t: Theme }) {
  const features = [
    { icon: 'location' as const, title: 'Geolocation Inteligente', sub: 'Integración con Maps y Waze para rutas compartidas.' },
    { icon: 'lock-closed' as const, title: 'Privacidad Laboral', sub: "Bloquea espacios de trabajo como 'Ocupado' para tu familia." },
    { icon: 'sync' as const, title: 'Importación Ágil', sub: 'Sincronización vía API con tus calendarios externos.' },
    { icon: 'bar-chart' as const, title: 'Jerarquía de Prioridades', sub: 'Visualiza qué eventos familiares son innegociables.' },
    { icon: 'stats-chart' as const, title: 'Métricas de Vida', sub: 'Analiza cuánto tiempo de calidad dedicas a los tuyos.' },
  ];
  const cardBg = t.isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.95)';
  const cardBorder = t.isDark ? 'rgba(55, 65, 81, 0.8)' : 'rgba(229, 231, 235, 0.9)';

  return (
    <View style={ill.featuresOuter}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ill.featuresScroll}
      >
        {features.map((f, i) => (
          <View
            key={i}
            style={[
              ill.featureCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <View style={ill.featureCardAccent} />
            <View style={ill.featureCardLeft}>
              <View style={ill.featureNumBadge}>
                <Text style={ill.featureNumText}>{String(i + 1).padStart(2, '0')}</Text>
              </View>
              <View style={ill.featureIconWrap}>
                <Ionicons name={f.icon} size={20} color={PRIMARY} />
              </View>
            </View>
            <View style={ill.featureText}>
              <Text style={[ill.featureTitle, { color: t.text }]}>{f.title}</Text>
              <Text style={[ill.featureSub, { color: t.muted }]}>{f.sub}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const ill = StyleSheet.create({
  welcomeOuter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  welcomeLogo:  { width: 110, height: 110 },
  welcomeName: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, color: '#111827' },
  welcomeDesc: { fontSize: 16, fontWeight: '500', textAlign: 'center', letterSpacing: 0.2 },
  oneMapOuter: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 32, paddingBottom: 12 },
  oneMapTextBlock: { alignItems: 'center' },
  oneMapTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', lineHeight: 30 },
  oneMapSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginTop: 6 },
  oneMapDiagramWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 180 },
  oneMapCenter: {
    width: BS, height: BS, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  oneMapFamsyncImg: { width: 72, height: 16, marginTop: 4 },
  oneMapCircle: { alignItems: 'center' },
  oneMapIconWrap: { width: CS, height: CS, borderRadius: CS / 2, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  oneMapEmoji: { fontSize: 22 },
  oneMapLabel: { fontSize: 9, color: '#6B7280', marginTop: 4, fontWeight: '700', letterSpacing: 0.3 },
  silosOuter: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 12 },
  silosTextBlock: { alignItems: 'center' },
  silosTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 28, paddingHorizontal: 8 },
  silosSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 10 },
  silosGraphicWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  silosGreenCircleOuter: {
    position: 'absolute',
    left: SC_CX - SC_R - 6,
    top: SC_CY - SC_R - 6,
    width: (SC_R + 6) * 2,
    height: (SC_R + 6) * 2,
    borderRadius: SC_R + 6,
    borderWidth: 2,
    borderColor: 'rgba(52, 199, 89, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  silosGreenCircle: {
    width: SC_R * 2,
    height: SC_R * 2,
    borderRadius: SC_R,
    backgroundColor: PRIMARY,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  silosBulbWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  silosMente: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  silosCrossedCard: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  silosCrossedIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silosCrossedX: { position: 'absolute', top: -4, right: -4 },
  silosX: { color: '#EF4444', fontSize: 14, fontWeight: '800' },
  silosXOverlay: { position: 'absolute', color: '#EF4444', fontSize: 16, fontWeight: '800', top: -2, right: -4 },
  caosOuter: { flex: 1, flexDirection: 'row', paddingHorizontal: 20, gap: 16, alignItems: 'center', justifyContent: 'center' },
  caosCol: { flex: 1, alignItems: 'center', gap: 8 },
  caosCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  caosEmoji: { fontSize: 28 },
  caosBubble: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', width: '100%' },
  caosBubbleText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  caosLabel: { fontSize: 12, fontWeight: '800', color: '#374151', marginTop: 8 },
  featuresOuter: { flex: 1, paddingHorizontal: 16 },
  featuresScroll: { paddingVertical: 20, paddingHorizontal: 4 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    paddingLeft: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  featureCardAccent: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: PRIMARY,
  },
  featureCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${PRIMARY}25`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureNumText: { fontSize: 11, fontWeight: '800', color: PRIMARY, letterSpacing: 0.5 },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${PRIMARY}18`,
    borderWidth: 1,
    borderColor: `${PRIMARY}35`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, paddingRight: 4 },
  featureTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  featureSub: { fontSize: 13, lineHeight: 19 },
  // Slide 6 & 7 — Rol y Ecosistema (premium)
  setupScroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  setupSectionWrap: { marginBottom: 20 },
  setupSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 14,
    opacity: 0.9,
  },
  setupRoleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    paddingLeft: 22,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  setupRoleCardAccent: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  setupRoleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  setupRoleText: { flex: 1 },
  setupRoleTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, letterSpacing: 0.2 },
  setupRoleDesc: { fontSize: 13, lineHeight: 18 },
  setupRoleCheck: { position: 'absolute', right: 18, top: 0, bottom: 0, justifyContent: 'center' },
  setupColorRow: { flexDirection: 'row', gap: 20, marginBottom: 8, justifyContent: 'center', flexWrap: 'wrap' },
  setupColorDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  setupColorDotSelected: { borderColor: PRIMARY, shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 8 },
  setupServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    paddingLeft: 22,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  setupServiceCardAccent: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  setupServiceIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  setupServiceText: { flex: 1, minWidth: 0 },
  setupServiceName: { fontSize: 16, fontWeight: '700', marginBottom: 4, letterSpacing: 0.2 },
  setupServiceSub: { fontSize: 13, lineHeight: 18 },
  setupConnectBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  setupConnectBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  setupCalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    paddingLeft: 22,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  setupCalCardAccent: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: PRIMARY,
  },
  setupCalText: { flex: 1, minWidth: 0 },
  setupCalName: { fontSize: 16, fontWeight: '700', marginBottom: 4, letterSpacing: 0.2 },
  setupCalSub: { fontSize: 13, lineHeight: 18 },
});

// ─── Slide 6 — Rol y Color ───────────────────────────────────────────────────
const ROLES = [
  { id: 'parent', label: 'Padre / Madre', desc: 'Gestión total del grupo familiar', icon: 'person' as const },
  { id: 'teen', label: 'Adolescente', desc: 'Participación activa en actividades', icon: 'happy-outline' as const },
  { id: 'viewer', label: 'Visualizador', desc: 'Acceso de lectura a eventos', icon: 'eye-outline' as const },
];
const ROLE_COLORS = ['#3B82F6', '#EC4899', '#F97316', '#22C55E'];

function RolColorIllustration({ t }: { t: Theme }) {
  const [role, setRole] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const cardBg = t.isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.98)';
  const iconBg = t.isDark ? '#374151' : '#F8FAFC';
  const iconBorder = t.isDark ? 'rgba(55, 65, 81, 0.6)' : 'rgba(229, 231, 235, 0.9)';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={ill.setupScroll} showsVerticalScrollIndicator={false}>
      <View style={ill.setupSectionWrap}>
        <Text style={[ill.setupSectionLabel, { color: t.muted }]}>SELECCIONA TU ROL</Text>
        {ROLES.map((r) => {
          const selected = role === r.id;
          return (
            <Pressable
              key={r.id}
              style={({ pressed }) => [
                ill.setupRoleCard,
                {
                  backgroundColor: cardBg,
                  borderColor: selected ? PRIMARY : t.border,
                  opacity: pressed ? 0.95 : 1,
                },
              ]}
              onPress={() => setRole(r.id)}
            >
              {selected && <View style={[ill.setupRoleCardAccent, { backgroundColor: PRIMARY }]} />}
              <View style={[ill.setupRoleIconWrap, { backgroundColor: iconBg, borderColor: selected ? `${PRIMARY}50` : iconBorder }]}>
                <Ionicons name={r.icon} size={24} color={selected ? PRIMARY : t.muted} />
              </View>
              <View style={ill.setupRoleText}>
                <Text style={[ill.setupRoleTitle, { color: t.text }]}>{r.label}</Text>
                <Text style={[ill.setupRoleDesc, { color: t.muted }]}>{r.desc}</Text>
              </View>
              {selected && (
                <View style={ill.setupRoleCheck}>
                  <Ionicons name="checkmark-circle" size={24} color={PRIMARY} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={ill.setupSectionWrap}>
        <Text style={[ill.setupSectionLabel, { color: t.muted }]}>ELIGE TU COLOR</Text>
        <View style={ill.setupColorRow}>
          {ROLE_COLORS.map((c) => {
            const selected = color === c;
            return (
              <Pressable
                key={c}
                style={({ pressed }) => [
                  ill.setupColorDot,
                  { backgroundColor: c, opacity: pressed ? 0.9 : 1 },
                  selected && ill.setupColorDotSelected,
                ]}
                onPress={() => setColor(c)}
              />
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Slide 7 — Integra ecosistema ───────────────────────────────────────────
const EXTERNAL_SERVICES = [
  { id: 'google', name: 'Google Calendar', sub: 'Conectar cuenta de Gmail', icon: 'logo-google' as const },
  { id: 'apple', name: 'Apple Calendar', sub: 'iCloud e iOS', icon: 'logo-apple' as const },
  { id: 'outlook', name: 'Outlook / Office', sub: 'Cuentas Microsoft 365', icon: 'mail' as const },
];
const SPECIAL_CALS = [
  { id: 'oficial-mx', name: 'Oficial México', sub: 'Festivos y días inhábiles' },
  { id: 'judio', name: 'Calendario Judío', sub: 'Festividades y Shabat' },
  { id: 'catolico', name: 'Calendario Católico', sub: 'Santoral y tiempos litúrgicos' },
];

function IntegraEcosistemaIllustration({ t }: { t: Theme }) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const cardBg = t.isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.98)';
  const iconBg = t.isDark ? '#374151' : '#F8FAFC';
  const iconBorder = t.isDark ? 'rgba(55, 65, 81, 0.6)' : 'rgba(229, 231, 235, 0.9)';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={ill.setupScroll} showsVerticalScrollIndicator={false}>
      <View style={ill.setupSectionWrap}>
        <Text style={[ill.setupSectionLabel, { color: t.muted }]}>SERVICIOS EXTERNOS</Text>
        {EXTERNAL_SERVICES.map((svc) => {
          const isConnected = connected[svc.id];
          return (
            <View
              key={svc.id}
              style={[
                ill.setupServiceCard,
                {
                  backgroundColor: cardBg,
                  borderColor: t.border,
                },
              ]}
            >
              <View style={[ill.setupServiceCardAccent, { backgroundColor: isConnected ? PRIMARY : 'transparent' }]} />
              <View style={[ill.setupServiceIconWrap, { backgroundColor: iconBg, borderColor: iconBorder }]}>
                <Ionicons name={svc.icon} size={24} color={t.text} />
              </View>
              <View style={ill.setupServiceText}>
                <Text style={[ill.setupServiceName, { color: t.text }]}>{svc.name}</Text>
                <Text style={[ill.setupServiceSub, { color: t.muted }]}>{svc.sub}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  ill.setupConnectBtn,
                  {
                    backgroundColor: isConnected ? `${PRIMARY}40` : PRIMARY,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                onPress={() => setConnected((prev) => ({ ...prev, [svc.id]: !prev[svc.id] }))}
              >
                <Text style={[ill.setupConnectBtnText, { color: isConnected ? PRIMARY : '#fff' }]}>
                  {isConnected ? 'Conectado' : 'Conectar'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={ill.setupSectionWrap}>
        <Text style={[ill.setupSectionLabel, { color: t.muted }]}>CALENDARIOS ESPECIALES</Text>
        {SPECIAL_CALS.map((cal) => {
          const isOn = toggles[cal.id] ?? false;
          return (
            <View
              key={cal.id}
              style={[
                ill.setupCalCard,
                {
                  backgroundColor: cardBg,
                  borderColor: t.border,
                },
              ]}
            >
              {isOn && <View style={ill.setupCalCardAccent} />}
              <View style={ill.setupCalText}>
                <Text style={[ill.setupCalName, { color: t.text }]}>{cal.name}</Text>
                <Text style={[ill.setupCalSub, { color: t.muted }]}>{cal.sub}</Text>
              </View>
              <Switch
                value={isOn}
                onValueChange={(v) => setToggles((prev) => ({ ...prev, [cal.id]: v }))}
                trackColor={{ false: t.border, true: PRIMARY }}
                thumbColor="#fff"
              />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Slides config ────────────────────────────────────────────────────────────

type SlideData = {
  id: string;
  accent: SlideAccent;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  ctaText: string;
  skipText: string | null;
  renderIllustration: (t: Theme) => React.JSX.Element;
};

const SLIDES: SlideData[] = [
  {
    id: 's1',
    accent: ACCENTS[0],
    title: '',
    subtitle: '',
    ctaText: 'Comenzar',
    skipText: null,
    renderIllustration: (t) => <WelcomeIllustration t={t} />,
  },
  {
    id: 's2',
    accent: ACCENTS[1],
    title: '',
    subtitle: '',
    ctaText: 'Siguiente',
    skipText: 'Anterior',
    renderIllustration: (t) => <OneMapIllustration t={t} />,
  },
  {
    id: 's3',
    accent: ACCENTS[2],
    title: '',
    subtitle: '',
    ctaText: 'Siguiente',
    skipText: 'Anterior',
    renderIllustration: (t) => <EliminaSilosIllustration t={t} />,
  },
  {
    id: 's4',
    accent: ACCENTS[3],
    title: 'Del caos a la sintonía',
    subtitle: 'Cuando todos tienen visibilidad, la familia fluye sin fricciones ni sorpresas.',
    ctaText: 'Siguiente',
    skipText: 'Anterior',
    renderIllustration: (t) => <DelCaosIllustration t={t} />,
  },
  {
    id: 's5',
    accent: ACCENTS[4],
    title: '¿Por qué elegir ',
    titleHighlight: 'FamSync?',
    subtitle: 'Herramientas de nivel profesional diseñadas para la vida familiar moderna.',
    ctaText: 'Siguiente',
    skipText: 'Anterior',
    renderIllustration: (t) => <PorQueFamSyncIllustration t={t} />,
  },
  {
    id: 's6',
    accent: ACCENTS[5],
    title: 'Personaliza tu identidad',
    subtitle: 'Elige tu rol y color para que el grupo sepa quién eres y qué permisos tienes.',
    ctaText: 'Continuar',
    skipText: 'Anterior',
    renderIllustration: (t) => <RolColorIllustration t={t} />,
  },
  {
    id: 's7',
    accent: ACCENTS[6],
    title: 'Tu centro de control digital',
    subtitle: 'Conecta tus calendarios existentes y centraliza todo en un solo ecosistema.',
    ctaText: 'Empezar a usar FamSync',
    skipText: 'Anterior',
    renderIllustration: (t) => <IntegraEcosistemaIllustration t={t} />,
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { width: SW, height: SH } = useWindowDimensions();
  // Cap slide dimensions so the component looks like a mobile app on all platforms
  const slideW  = SW;
  const ilHeight = Math.min(Math.floor(SH * 0.58), 400);
  const flatRef = useRef<FlatList>(null);
  const idxRef  = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);

  // ── Animations ──────────────────────────────────────────────────────────────
  const contentOpacity  = useRef(new Animated.Value(1)).current;
  const contentSlide    = useRef(new Animated.Value(0)).current;
  const btnScale        = useRef(new Animated.Value(1)).current;
  const dotAnims        = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  useEffect(() => {
    // Fade + rise content on slide change
    Animated.sequence([
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 0, duration: 90, useNativeDriver: true }),
        Animated.timing(contentSlide,   { toValue: 10, duration: 90, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(contentSlide,   { toValue: 0, useNativeDriver: true, tension: 70, friction: 9 }),
      ]),
    ]).start();

    // Animate dots
    SLIDES.forEach((_, i) => {
      Animated.spring(dotAnims[i], {
        toValue: i === activeIdx ? 1 : 0,
        useNativeDriver: false,
        tension: 130,
        friction: 8,
      }).start();
    });
  }, [activeIdx]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) {
        const idx = viewableItems[0].index ?? 0;
        idxRef.current = idx;
        setActiveIdx(idx);
      }
    }
  ).current;

  const getItemLayout = (_: unknown, index: number) => ({
    length: slideW,
    offset: slideW * index,
    index,
  });

  const navigate = (index: number) => {
    if (index < 0 || index >= SLIDES.length) return;
    flatRef.current?.scrollToIndex({ index, animated: true });
    idxRef.current = index;
    setActiveIdx(index);
  };

  const done = async () => {
    await setItem(ONBOARDING_DONE_KEY, 'true');
    await setItem(SETUP_DONE_KEY, 'true');
    router.replace('/(tabs)');
  };

  const isLast  = activeIdx === SLIDES.length - 1;
  const current = SLIDES[activeIdx];

  const renderSlide = ({ item }: { item: SlideData }) => (
    <View
      style={{
        width: slideW,
        height: ilHeight,
        backgroundColor: t.isDark ? item.accent.darkBg : item.accent.lightBg,
      }}
    >
      {item.renderIllustration(t)}
    </View>
  );

  return (
    <View style={[s.screen, { backgroundColor: t.bg }]}>
      <View style={s.centerWrap}>

        {/* ── Illustration pager ──────────────────────────────────────────── */}
        <FlatList
          ref={flatRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          style={{ height: ilHeight, flexGrow: 0 }}
        />

        {/* ── Bottom panel ────────────────────────────────────────────────── */}
        <View style={[s.bottom, { backgroundColor: t.bg, paddingBottom: insets.bottom + 20 }]}>

        {/* Animated text content */}
        <Animated.View
          style={[
            s.textWrap,
            { opacity: contentOpacity, transform: [{ translateY: contentSlide }] },
          ]}
        >
          {(current.title || current.titleHighlight) ? (
            <Text style={[s.title, { color: t.text }]}>
              {current.title}
              {current.titleHighlight
                ? <Text style={{ color: PRIMARY }}>{current.titleHighlight}</Text>
                : null}
            </Text>
          ) : null}
          {current.subtitle ? (
            <Text style={[s.subtitle, { color: t.muted }]}>{current.subtitle}</Text>
          ) : null}
        </Animated.View>

        {/* ── Navigation row: back | dots | counter ─────────────────────── */}
        <View style={s.navRow}>

          {/* Back chevron */}
          <Pressable
            onPress={() => navigate(activeIdx - 1)}
            disabled={activeIdx === 0}
            hitSlop={12}
            style={[s.navSide, { opacity: activeIdx > 0 ? 1 : 0 }]}
          >
            <View style={[s.backCircle, { backgroundColor: t.isDark ? '#1F2937' : '#F3F4F6' }]}>
              <Ionicons name="chevron-back" size={18} color={t.muted} />
            </View>
          </Pressable>

          {/* Animated dots */}
          <View style={s.dots}>
            {SLIDES.map((slide, i) => (
              <Pressable key={slide.id} onPress={() => navigate(i)} hitSlop={8}>
                <Animated.View
                  style={[
                    s.dot,
                    {
                      backgroundColor: i === activeIdx ? current.accent.dot : t.border,
                      width: dotAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [6, 22],
                      }),
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>

          {/* Slide counter */}
          <View style={s.navSide}>
            <Text style={[s.counter, { color: t.muted }]}>
              {activeIdx + 1}
              <Text style={{ opacity: 0.45 }}>/{SLIDES.length}</Text>
            </Text>
          </View>
        </View>

        {/* ── CTA button with spring press ──────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            style={s.btn}
            onPress={isLast ? done : () => navigate(activeIdx + 1)}
            onPressIn={() =>
              Animated.spring(btnScale, {
                toValue: 0.97,
                useNativeDriver: true,
                tension: 200,
                friction: 7,
              }).start()
            }
            onPressOut={() =>
              Animated.spring(btnScale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 200,
                friction: 7,
              }).start()
            }
          >
            <Text style={s.btnText}>{current.ctaText}</Text>
            {!isLast && <Ionicons name="arrow-forward" size={20} color="#fff" />}
          </Pressable>
        </Animated.View>

        {/* Footer on last slide */}
        {isLast && (
          <Text style={[s.footerText, { color: t.muted }]}>
            FamSync · Tu familia, sincronizada
          </Text>
        )}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:     { flex: 1 },
  centerWrap: { flex: 1, justifyContent: 'center' },

  bottom: {
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'stretch',
  },

  textWrap: { minHeight: 64, marginBottom: 12 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  navSide: { width: 44, alignItems: 'center' },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot:  { height: 6, borderRadius: 3 },
  counter: { fontSize: 13, fontWeight: '600' },

  btn: {
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    height: 56,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

  footerText: { fontSize: 12, textAlign: 'center', marginTop: 14 },
});
