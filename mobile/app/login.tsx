import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../lib/googleAuth';
import { useColorScheme } from '../hooks/use-color-scheme';

const PRIMARY = '#34C759';
const LOGO_GREEN = '#1D7063';

export default function LoginScreen() {
  const { loginWithGoogle, requestEmailOTP, verifyEmailOTP } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'choose' | 'email' | 'verify'>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const colors = {
    bg: isDark ? '#0F1419' : '#FFFFFF',
    bgSoft: isDark ? '#1A1F26' : '#F9FAFB',
    text: isDark ? '#F3F4F6' : '#111827',
    textMuted: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    error: '#EF4444',
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      if (idToken) {
        await loginWithGoogle(idToken);
        router.replace('/');
      } else {
        setError('Inicio de sesión con Google cancelado');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!email.trim()) {
      setError('Introduce tu correo electrónico');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestEmailOTP(email.trim());
      setStep('verify');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (code.length !== 6) {
      setError('Ingresa el código de 6 dígitos');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyEmailOTP(email.trim(), code);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido o caducado');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(step === 'verify' ? 'email' : 'choose');
    setError('');
    setCode('');
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step !== 'choose' && (
            <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          )}

          {step === 'choose' && (
            <>
              <View style={styles.hero}>
                <View style={[styles.logoBox, { backgroundColor: LOGO_GREEN }]}>
                  <Text style={styles.logoText}>FAMSYNC</Text>
                </View>
                <Text style={[styles.heroTitle, { color: colors.text }]}>Tu familia, en sintonía.</Text>
                <Text style={[styles.heroSub, { color: colors.textMuted }]}>
                  Organiza, comparte y conecta con los que más quieres en un solo lugar.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => setStep('email')}
              >
                <Text style={styles.primaryBtnText}>Comenzar</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => setStep('email')}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Iniciar Sesión</Text>
              </Pressable>

              <Text style={[styles.legal, { color: colors.textMuted }]}>
                Al continuar, aceptas nuestras{' '}
                <Text style={styles.legalLink}>Condiciones de Servicio</Text> y confirmas que has leído nuestra{' '}
                <Text style={styles.legalLink}>Política de Privacidad</Text>.
              </Text>
            </>
          )}

          {step === 'email' && (
            <>
              <View style={styles.hero}>
                <View style={[styles.logoBoxSmall, { backgroundColor: LOGO_GREEN }]}>
                  <Text style={styles.logoTextSmall}>FAMSYNC</Text>
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Tu correo</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  Te enviaremos un código de 6 dígitos
                </Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgSoft, borderColor: colors.border, color: colors.text }]}
                placeholder="nombre@ejemplo.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { opacity: loading ? 0.7 : pressed ? 0.9 : 1 },
                ]}
                onPress={handleRequestOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Enviar código</Text>
                )}
              </Pressable>
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>o</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { borderColor: colors.border, opacity: loading ? 0.7 : pressed ? 0.9 : 1 },
                ]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color={colors.text} />
                    <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Continuar con Google</Text>
                  </>
                )}
              </Pressable>
            </>
          )}

          {step === 'verify' && (
            <>
              <Text style={[styles.protocolTitle, { color: colors.text }]}>Protocolo de Acceso</Text>
              <Text style={[styles.protocolSub, { color: colors.textMuted }]}>
                Ingresa el código de 6 digitos enviado a tu dispositivo
              </Text>

              <TextInput
                style={[styles.otpInput, { backgroundColor: colors.bgSoft, borderColor: colors.border, color: colors.text }]}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!loading}
              />

              <Pressable onPress={handleRequestOTP} style={styles.resendWrap}>
                <Text style={styles.resendText}>No recibiste el código? Reenviar</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { opacity: loading || code.length !== 6 ? 0.6 : pressed ? 0.9 : 1 },
                ]}
                onPress={handleVerifyOTP}
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verificar código</Text>
                )}
              </Pressable>
            </>
          )}

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: isDark ? '#3F1D1D' : '#FEF2F2', marginTop: 16 }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', minHeight: '100%' },
  backButton: { alignSelf: 'flex-start', padding: 8, marginBottom: 16 },
  hero: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 160, height: 160, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 28,
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 2.5 },
  logoBoxSmall: {
    width: 100, height: 100, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    gap: 5, marginBottom: 20,
  },
  logoTextSmall: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  heroTitle: { fontSize: 24, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  heroSub: { fontSize: 15, lineHeight: 22, textAlign: 'center', paddingHorizontal: 16 },
  primaryBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1.5,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600' },
  legal: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
  legalLink: { textDecorationLine: 'underline', fontWeight: '600' },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  cardSubtitle: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    marginBottom: 20,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 14, fontWeight: '500' },
  protocolTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  protocolSub: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  otpInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 20,
  },
  resendWrap: { alignSelf: 'center', marginBottom: 24 },
  resendText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  errorText: { fontSize: 14, fontWeight: '500', flex: 1 },
});
