import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setItem, SETUP_DONE_KEY } from '../../lib/storage';

const PRIMARY = '#34C759';

const EXTERNAL_SERVICES = [
  { id: 'google', name: 'Google Calendar', sub: 'Conectar cuenta de Gmail', icon: 'logo-google' as const },
  { id: 'apple', name: 'Apple Calendar', sub: 'iCloud e iOS', icon: 'logo-apple' as const },
  { id: 'outlook', name: 'Outlook / Office', sub: 'Cuentas Microsoft 365', icon: 'mail' as const },
];

const SPECIAL_CALENDARS = [
  { id: 'oficial-mx', name: 'Oficial México', sub: 'Festivos y días inhábiles' },
  { id: 'judio', name: 'Calendario Judío', sub: 'Festividades y Shabat' },
  { id: 'catolico', name: 'Calendario Católico', sub: "Santoral y tiempos litúrgicos" },
];

export default function CalendariosScreen() {
  const insets = useSafeAreaInsets();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  const handleFinalize = async () => {
    await setItem(SETUP_DONE_KEY, 'true');
    router.replace('/(tabs)');
  };

  const handleConfigureLater = async () => {
    await setItem(SETUP_DONE_KEY, 'true');
    router.replace('/(tabs)');
  };

  return (
    <View style={[s.wrapper, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>

        <Text style={s.title}>Integra tu ecosistema digital</Text>
        <Text style={s.subtitle}>
          Sincroniza tus calendarios existentes para que FamSync sea tu centro de control unificado.
        </Text>

        <Text style={s.sectionLabel}>SERVICIOS EXTERNOS</Text>
        {EXTERNAL_SERVICES.map((svc) => (
          <View key={svc.id} style={s.serviceCard}>
            <View style={s.serviceIconWrap}>
              <Ionicons name={svc.icon} size={24} color="#374151" />
            </View>
            <View style={s.serviceText}>
              <Text style={s.serviceName}>{svc.name}</Text>
              <Text style={s.serviceSub}>{svc.sub}</Text>
            </View>
            <Pressable style={s.connectBtn}>
              <Text style={s.connectBtnText}>Conectar</Text>
            </Pressable>
          </View>
        ))}

        <Text style={[s.sectionLabel, { marginTop: 28 }]}>CALENDARIOS ESPECIALES</Text>
        {SPECIAL_CALENDARS.map((cal) => (
          <View key={cal.id} style={s.calCard}>
            <View style={s.calText}>
              <Text style={s.calName}>{cal.name}</Text>
              <Text style={s.calSub}>{cal.sub}</Text>
            </View>
            <Switch
              value={toggles[cal.id] ?? false}
              onValueChange={(v) => setToggles((prev) => ({ ...prev, [cal.id]: v }))}
              trackColor={{ false: '#E5E7EB', true: PRIMARY }}
              thumbColor="#fff"
            />
          </View>
        ))}

        <Pressable style={({ pressed }) => [s.cta, { opacity: pressed ? 0.9 : 1 }]} onPress={handleFinalize}>
          <Text style={s.ctaText}>Finalizar Configuración</Text>
        </Pressable>

        <Pressable onPress={handleConfigureLater} style={s.laterBtn}>
          <Text style={s.laterText}>Configurar más tarde</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  scroll: { paddingBottom: 40 },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 12 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  serviceIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  serviceText: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  serviceSub: { fontSize: 13, color: '#6B7280' },
  connectBtn: { backgroundColor: PRIMARY, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  connectBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  calCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  calText: { flex: 1 },
  calName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  calSub: { fontSize: 13, color: '#6B7280' },
  cta: {
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  laterBtn: { alignItems: 'center', marginTop: 16 },
  laterText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
});
