import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { setItem, SETUP_DONE_KEY } from '../../lib/storage';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#34C759';
const ROLES = [
  { id: 'parent', label: 'Padre / Madre', desc: 'Gestión total del grupo familiar', icon: 'person' as const },
  { id: 'teen', label: 'Adolescente', desc: 'Participación activa en actividades', icon: 'happy-outline' as const },
  { id: 'viewer', label: 'Visualizador', desc: 'Acceso de lectura a eventos', icon: 'eye-outline' as const },
];
const COLORS = ['#3B82F6', '#EC4899', '#F97316', '#22C55E'];

export default function RolColorScreen() {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

  const handleContinue = () => {
    router.replace('/setup/calendarios');
  };

  return (
    <View style={[s.wrapper, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={async () => {
            await setItem(SETUP_DONE_KEY, 'true');
            router.replace('/(tabs)');
          }}
          style={s.backBtn}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>

        <Text style={s.title}>Asigna tu Rol y elige un Color</Text>
        <Text style={s.subtitle}>Personaliza cómo te verán los demás miembros de la familia.</Text>

        <Text style={s.sectionLabel}>SELECCIONA TU ROL</Text>
        {ROLES.map((r) => {
          const selected = role === r.id;
          return (
            <Pressable
              key={r.id}
              style={[s.roleCard, selected && s.roleCardSelected]}
              onPress={() => setRole(r.id)}
            >
              <View style={s.roleIconWrap}>
                <Ionicons name={r.icon} size={22} color={selected ? PRIMARY : '#9CA3AF'} />
              </View>
              <View style={s.roleText}>
                <Text style={s.roleTitle}>{r.label}</Text>
                <Text style={s.roleDesc}>{r.desc}</Text>
              </View>
            </Pressable>
          );
        })}

        <Text style={[s.sectionLabel, { marginTop: 24 }]}>ELIGE TU COLOR</Text>
        <View style={s.colorRow}>
          {COLORS.map((c) => (
            <Pressable
              key={c}
              style={[s.colorDot, { backgroundColor: c }, color === c && s.colorDotSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [s.cta, { opacity: pressed ? 0.9 : 1 }]}
          onPress={handleContinue}
        >
          <Text style={s.ctaText}>Continuar</Text>
        </Pressable>

        <Text style={s.stepLabel}>Paso 4 de 5</Text>
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
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  roleCardSelected: { borderColor: PRIMARY },
  roleIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  roleText: { flex: 1 },
  roleTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  roleDesc: { fontSize: 13, color: '#6B7280' },
  colorRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  colorDot: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: 'transparent' },
  colorDotSelected: { borderColor: PRIMARY },
  cta: {
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  stepLabel: { textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 16 },
});
