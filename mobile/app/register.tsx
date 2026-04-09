import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
const { height: SH } = Dimensions.get('window');

// ── Sub-components ────────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <View style={bar.row}>
      <View style={[bar.seg, { backgroundColor: PRIMARY }]} />
      <View style={[bar.seg, { backgroundColor: current >= 1 ? PRIMARY : '#E2E8F0' }]} />
    </View>
  );
}

const bar = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 40, height: 4 },
  seg: { flex: 1, borderRadius: 2 },
});

function ErrorNote({ msg, isDark }: { msg: string; isDark: boolean }) {
  return (
    <View style={[en.wrap, { backgroundColor: isDark ? '#2C1515' : '#FEF2F2' }]}>
      <Ionicons name="alert-circle" size={15} color="#EF4444" />
      <Text style={en.txt}>{msg}</Text>
    </View>
  );
}

const en = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, marginTop: 8, marginBottom: 4,
  },
  txt: { color: '#EF4444', fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const { loginWithGoogle, requestEmailOTP, verifyEmailOTP } = useAuth();
  const [email, setEmail]           = useState('');
  const [otp, setOtp]               = useState(['', '', '', '', '', '']);
  const [step, setStep]             = useState<'choose' | 'email' | 'verify'>('choose');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const insets = useSafeAreaInsets();
  const isDark = (useColorScheme() ?? 'light') === 'dark';

  const c = {
    bg:     isDark ? '#0A0E14' : '#FFFFFF',
    bgSoft: isDark ? '#141921' : '#F8FAFC',
    bgCard: isDark ? '#1A2030' : '#FAFAFA',
    text:   isDark ? '#F1F5F9' : '#0F172A',
    muted:  isDark ? '#8892A4' : '#64748B',
    border: isDark ? '#2A3447' : '#E2E8F0',
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const code = otp.join('');

  const handleOtpChange = (val: string, idx: number) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 1) {
      const next = ['', '', '', '', '', ''];
      cleaned.slice(0, 6).split('').forEach((d, i) => { next[i] = d; });
      setOtp(next);
      otpRefs.current[Math.min(cleaned.length - 1, 5)]?.focus();
      return;
    }
    const digit = cleaned.slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    setError('');
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = '';
      setOtp(next);
      otpRefs.current[idx - 1]?.focus();
    }
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
        setError('Registro con Google cancelado');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!email.trim()) { setError('Introduce tu correo electrónico'); return; }
    setError('');
    setLoading(true);
    try {
      await requestEmailOTP(email.trim());
      setStep('verify');
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      await requestEmailOTP(email.trim());
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (code.length !== 6) { setError('Ingresa los 6 dígitos'); return; }
    setError('');
    setLoading(true);
    try {
      await verifyEmailOTP(email.trim(), code);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido o caducado');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep(step === 'verify' ? 'email' : 'choose');
    setError('');
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <View style={[s.root, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kav}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── CHOOSE ─────────────────────────────────────────────────────── */}
          {step === 'choose' && (
            <View style={[s.chooseWrap, { minHeight: SH - insets.top - insets.bottom - 48 }]}>

              <View style={s.hero}>
                <Image
                  source={require('../assets/images/famsync_logo.png')}
                  style={s.heroLogo}
                  resizeMode="contain"
                />
                {!isDark && (
                  <Text style={s.heroName}>FamSync</Text>
                )}
                <Text style={[s.heroTitle, { color: c.text }]}>Crear una cuenta</Text>
                <Text style={[s.tagline, { color: c.muted }]}>
                  Únete y organiza tu vida familiar.
                </Text>
              </View>

              <View>
                <Pressable
                  style={({ pressed }) => [
                    s.googleBtn,
                    { borderColor: c.border, backgroundColor: c.bgCard, opacity: pressed ? 0.82 : 1 },
                  ]}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color={c.muted} size="small" />
                    : <>
                        <Ionicons name="logo-google" size={20} color="#4285F4" />
                        <Text style={[s.googleBtnText, { color: c.text }]}>Registrarse con Google</Text>
                      </>
                  }
                </Pressable>

                <View style={s.orRow}>
                  <View style={[s.orLine, { backgroundColor: c.border }]} />
                  <Text style={[s.orLabel, { color: c.muted }]}>o con tu correo</Text>
                  <View style={[s.orLine, { backgroundColor: c.border }]} />
                </View>

                <Pressable
                  style={({ pressed }) => [s.primaryBtn, { opacity: pressed ? 0.88 : 1 }]}
                  onPress={() => setStep('email')}
                >
                  <Ionicons name="mail-outline" size={19} color="#fff" />
                  <Text style={s.primaryBtnText}>Usar correo electrónico</Text>
                </Pressable>

                {error ? <ErrorNote msg={error} isDark={isDark} /> : null}
              </View>

              <View style={s.footer}>
                <Text style={[s.footerText, { color: c.muted }]}>¿Ya tienes cuenta? </Text>
                <Link href="/login" asChild>
                  <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                    <Text style={[s.footerLink, { color: PRIMARY }]}>Iniciar sesión</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          )}

          {/* ── EMAIL ──────────────────────────────────────────────────────── */}
          {step === 'email' && (
            <View style={s.stepWrap}>
              <Pressable onPress={goBack} style={s.backBtn} hitSlop={16}>
                <Ionicons name="arrow-back" size={22} color={c.text} />
              </Pressable>

              <StepBar current={0} />

              <View style={s.stepHead}>
                <Image
                  source={require('../assets/images/famsync_logo.png')}
                  style={s.stepLogo}
                  resizeMode="contain"
                />
                <Text style={[s.stepTitle, { color: c.text }]}>¿Cuál es tu correo?</Text>
                <Text style={[s.stepSub, { color: c.muted }]}>
                  Te enviaremos un código de verificación de 6 dígitos.
                </Text>
              </View>

              <TextInput
                style={[
                  s.input,
                  {
                    backgroundColor: c.bgSoft,
                    borderColor: emailFocused ? PRIMARY : c.border,
                    color: c.text,
                  },
                ]}
                placeholder="nombre@ejemplo.com"
                placeholderTextColor={c.muted}
                value={email}
                onChangeText={t => { setEmail(t); setError(''); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                autoFocus
                editable={!loading}
                returnKeyType="send"
                onSubmitEditing={handleRequestOTP}
              />

              {error ? <ErrorNote msg={error} isDark={isDark} /> : null}

              <Pressable
                style={({ pressed }) => [
                  s.primaryBtn,
                  { marginTop: 8, opacity: loading ? 0.7 : pressed ? 0.88 : 1 },
                ]}
                onPress={handleRequestOTP}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Text style={s.primaryBtnText}>Enviar código</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                }
              </Pressable>

              <View style={[s.orRow, { marginTop: 20 }]}>
                <View style={[s.orLine, { backgroundColor: c.border }]} />
                <Text style={[s.orLabel, { color: c.muted }]}>o</Text>
                <View style={[s.orLine, { backgroundColor: c.border }]} />
              </View>

              <Pressable
                style={({ pressed }) => [
                  s.googleBtn,
                  { borderColor: c.border, backgroundColor: c.bgCard, opacity: loading ? 0.7 : pressed ? 0.82 : 1 },
                ]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={[s.googleBtnText, { color: c.text }]}>Registrarse con Google</Text>
              </Pressable>
            </View>
          )}

          {/* ── VERIFY ─────────────────────────────────────────────────────── */}
          {step === 'verify' && (
            <View style={s.stepWrap}>
              <Pressable onPress={goBack} style={s.backBtn} hitSlop={16}>
                <Ionicons name="arrow-back" size={22} color={c.text} />
              </Pressable>

              <StepBar current={1} />

              <View style={s.stepHead}>
                <View style={[s.mailBadge, { backgroundColor: `${PRIMARY}18` }]}>
                  <Ionicons name="mail" size={30} color={PRIMARY} />
                </View>
                <Text style={[s.stepTitle, { color: c.text }]}>Revisa tu correo</Text>
                <Text style={[s.stepSub, { color: c.muted }]}>
                  Enviamos un código de 6 dígitos a{'\n'}
                  <Text style={{ color: c.text, fontWeight: '600' }}>{email}</Text>
                </Text>
              </View>

              <View style={s.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={r => { otpRefs.current[i] = r; }}
                    style={[
                      s.otpBox,
                      {
                        backgroundColor: c.bgSoft,
                        borderColor: digit ? PRIMARY : c.border,
                        color: c.text,
                      },
                    ]}
                    value={digit}
                    onChangeText={v => handleOtpChange(v, i)}
                    onKeyPress={({ nativeEvent }) => handleOtpKey(nativeEvent.key, i)}
                    keyboardType="number-pad"
                    maxLength={2}
                    editable={!loading}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {error ? <ErrorNote msg={error} isDark={isDark} /> : null}

              <Pressable
                style={({ pressed }) => [
                  s.primaryBtn,
                  {
                    marginTop: 28,
                    opacity: loading || code.length !== 6 ? 0.5 : pressed ? 0.88 : 1,
                  },
                ]}
                onPress={handleVerifyOTP}
                disabled={loading || code.length !== 6}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.primaryBtnText}>Crear cuenta</Text>
                }
              </Pressable>

              <Pressable
                onPress={handleResend}
                style={s.resendRow}
                disabled={resendCooldown > 0 || loading}
              >
                <Text style={[s.resendBase, { color: c.muted }]}>
                  {resendCooldown > 0
                    ? `Reenviar código en ${resendCooldown}s`
                    : '¿No llegó el código? '}
                </Text>
                {resendCooldown === 0 && (
                  <Text style={[s.resendAction, { color: PRIMARY }]}>Reenviar</Text>
                )}
              </Pressable>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:  { flex: 1 },
  kav:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },

  chooseWrap: { justifyContent: 'space-between', paddingTop: 16 },
  hero: { alignItems: 'center', gap: 10, paddingTop: 32, paddingBottom: 36 },
  heroLogo: { width: 100, height: 100 },
  heroName: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, color: '#111827' },
  heroTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  tagline:   { fontSize: 15, lineHeight: 22, textAlign: 'center' },

  primaryBtn: {
    backgroundColor: PRIMARY,
    height: 56, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  googleBtn: {
    height: 56, borderRadius: 16, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 12,
  },
  googleBtnText: { fontSize: 16, fontWeight: '600' },

  orRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  orLine:  { flex: 1, height: 1 },
  orLabel: { fontSize: 13, fontWeight: '500' },

  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 8, paddingTop: 8 },
  footerText: { fontSize: 15 },
  footerLink: { fontSize: 15, fontWeight: '700' },

  stepWrap:  { flex: 1, paddingTop: 8 },
  backBtn:   { alignSelf: 'flex-start', padding: 4, marginBottom: 24 },
  stepHead:  { alignItems: 'center', marginBottom: 32 },
  stepLogo:  { width: 68, height: 68, marginBottom: 20 },
  mailBadge: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepTitle: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 },
  stepSub:   { fontSize: 15, lineHeight: 22, textAlign: 'center' },

  input: {
    height: 56, borderWidth: 1.5, borderRadius: 16,
    paddingHorizontal: 18, fontSize: 16, marginBottom: 8,
  },

  otpRow: { flexDirection: 'row', gap: 8 },
  otpBox: {
    flex: 1, height: 64, borderRadius: 14, borderWidth: 2,
    fontSize: 24, fontWeight: '700', textAlign: 'center',
  },

  resendRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 2 },
  resendBase:   { fontSize: 14 },
  resendAction: { fontSize: 14, fontWeight: '700' },
});
