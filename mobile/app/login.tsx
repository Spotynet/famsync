import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  useWindowDimensions,
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

// ── OTP Cell ──────────────────────────────────────────────────────────────────

type CellColors = { bgSoft: string; text: string; border: string };

function OtpCell({
  digit, focused, error, isDark, c, size,
}: {
  digit: string; focused: boolean; error: boolean;
  isDark: boolean; c: CellColors; size: number;
}) {
  const scale         = useRef(new Animated.Value(1)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (digit) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.13, useNativeDriver: true, tension: 280, friction: 6 }),
        Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 280, friction: 8 }),
      ]).start();
    } else {
      scale.setValue(1);
    }
  }, [digit]);

  useEffect(() => {
    if (focused && !digit) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, { toValue: 0, duration: 520, useNativeDriver: true }),
          Animated.timing(cursorOpacity, { toValue: 1, duration: 520, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => { loop.stop(); cursorOpacity.setValue(1); };
    }
  }, [focused, digit]);

  const borderColor = error
    ? '#EF4444'
    : focused
    ? PRIMARY
    : digit
    ? `${PRIMARY}99`
    : c.border;

  const bgColor = error && digit
    ? (isDark ? '#2C1515' : '#FFF1F1')
    : focused
    ? (isDark ? `${PRIMARY}18` : `${PRIMARY}0A`)
    : digit
    ? (isDark ? `${PRIMARY}14` : `${PRIMARY}07`)
    : c.bgSoft;

  return (
    <Animated.View style={[
      oc.cell,
      {
        width: size, height: size,
        borderColor,
        backgroundColor: bgColor,
        borderWidth: focused ? 2.5 : digit ? 2 : 1.5,
        transform: [{ scale }],
      },
    ]}>
      {digit ? (
        <Text style={[oc.digit, { color: error ? '#EF4444' : c.text }]}>{digit}</Text>
      ) : focused ? (
        <Animated.View style={[oc.cursor, { opacity: cursorOpacity }]} />
      ) : null}
    </Animated.View>
  );
}

const oc = StyleSheet.create({
  cell: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  digit: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  cursor: {
    width: 2,
    height: 26,
    borderRadius: 1,
    backgroundColor: PRIMARY,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { loginWithGoogle, requestEmailOTP, verifyEmailOTP } = useAuth();
  const [email, setEmail]           = useState('');
  const [otpValue, setOtpValue]     = useState('');
  const [step, setStep]             = useState<'choose' | 'email' | 'verify'>('choose');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const hiddenInputRef = useRef<TextInput>(null);

  const insets = useSafeAreaInsets();
  const { height: SH, width: SW } = useWindowDimensions();
  const BOX_GAP  = 10;
  const BOX_SIZE = Math.min(54, Math.floor((SW - 48 - BOX_GAP * 5) / 6));
  const isDark = (useColorScheme() ?? 'light') === 'dark';

  const c = {
    bg:     isDark ? '#0F1419' : '#FFFFFF',
    bgSoft: isDark ? '#1A1F26' : '#F9FAFB',
    bgCard: isDark ? '#1A1F26' : '#FAFAFA',
    text:   isDark ? '#F3F4F6' : '#111827',
    muted:  isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
  };

  // Resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleOtpChange = (val: string) => {
    setOtpValue(val.replace(/\D/g, '').slice(0, 6));
    setError('');
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
    if (!email.trim()) { setError('Introduce tu correo electrónico'); return; }
    setError('');
    setLoading(true);
    try {
      await requestEmailOTP(email.trim());
      setStep('verify');
      setOtpValue('');
      setResendCooldown(30);
      setTimeout(() => hiddenInputRef.current?.focus(), 400);
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
      setOtpValue('');
      setResendCooldown(30);
      setTimeout(() => hiddenInputRef.current?.focus(), 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6) { setError('Ingresa los 6 dígitos'); return; }
    setError('');
    setLoading(true);
    try {
      await verifyEmailOTP(email.trim(), otpValue);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido o caducado');
      setOtpValue('');
      setTimeout(() => hiddenInputRef.current?.focus(), 200);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep(step === 'verify' ? 'email' : 'choose');
    setError('');
    setOtpValue('');
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

              {/* Hero + buttons grouped in center */}
              <View style={s.heroGroup}>
                <Image
                  source={require('../assets/images/famsync_logo.png')}
                  style={s.heroLogo}
                  resizeMode="contain"
                />
                {!isDark && (
                  <Text style={s.heroName}>FamSync</Text>
                )}
                <Text style={[s.tagline, { color: c.muted }]}>
                  Tu familia, en sintonía.
                </Text>

                <View style={s.heroActions}>
                {/* Google — primary on landing */}
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
                        <Text style={[s.googleBtnText, { color: c.text }]}>Continuar con Google</Text>
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
                </View>{/* heroActions */}
              </View>{/* heroGroup */}

              {/* Legal */}
              <Text style={[s.legal, { color: c.muted }]}>
                Al continuar aceptas nuestras{' '}
                <Text style={[s.legalLink, { color: PRIMARY }]}>Condiciones</Text>
                {' '}y nuestra{' '}
                <Text style={[s.legalLink, { color: PRIMARY }]}>Política de Privacidad</Text>.
              </Text>
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
                <Text style={[s.googleBtnText, { color: c.text }]}>Continuar con Google</Text>
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

              {/* 6-cell OTP — single hidden input + visual overlay */}
              <Pressable
                style={s.otpWrap}
                onPress={() => hiddenInputRef.current?.focus()}
              >
                <View style={[s.otpRow, { gap: BOX_GAP }]}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <OtpCell
                      key={i}
                      digit={otpValue[i] || ''}
                      focused={i === otpValue.length && !loading}
                      error={!!error}
                      isDark={isDark}
                      c={c}
                      size={BOX_SIZE}
                    />
                  ))}
                </View>
                <TextInput
                  ref={hiddenInputRef}
                  style={s.hiddenInput}
                  value={otpValue}
                  onChangeText={handleOtpChange}
                  keyboardType="number-pad"
                  maxLength={6}
                  caretHidden
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  editable={!loading}
                  autoFocus
                />
              </Pressable>

              {error ? <ErrorNote msg={error} isDark={isDark} /> : null}

              <Pressable
                style={({ pressed }) => [
                  s.primaryBtn,
                  {
                    marginTop: 28,
                    opacity: loading || otpValue.length !== 6 ? 0.5 : pressed ? 0.88 : 1,
                  },
                ]}
                onPress={handleVerifyOTP}
                disabled={loading || otpValue.length !== 6}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.primaryBtnText}>Verificar código</Text>
                }
              </Pressable>

              {/* Resend */}
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

  // ── Choose
  chooseWrap: { flex: 1, justifyContent: 'space-between' },
  heroGroup:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  heroActions: { alignSelf: 'stretch', marginTop: 32 },
  heroLogo: { width: 160, height: 160 },
  heroName: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, color: '#111827' },
  tagline:  { fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 4 },

  // ── Shared buttons
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

  // ── Divider
  orRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  orLine:  { flex: 1, height: 1 },
  orLabel: { fontSize: 13, fontWeight: '500' },

  // ── Legal
  legal:     { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8, paddingBottom: 8 },
  legalLink: { fontWeight: '600' },

  // ── Step screens
  stepWrap: { flex: 1, paddingTop: 8 },
  backBtn:  { alignSelf: 'flex-start', padding: 4, marginBottom: 24 },

  stepHead:  { alignItems: 'center', marginBottom: 32 },
  stepLogo:  { width: 68, height: 68, marginBottom: 20 },
  mailBadge: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepTitle: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 },
  stepSub:   { fontSize: 15, lineHeight: 22, textAlign: 'center' },

  // ── Email input
  input: {
    height: 56, borderWidth: 1.5, borderRadius: 16,
    paddingHorizontal: 18, fontSize: 16, marginBottom: 8,
  },

  // ── OTP
  otpWrap: { alignSelf: 'center', marginBottom: 4 },
  otpRow:  { flexDirection: 'row' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },

  // ── Resend
  resendRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 2 },
  resendBase:   { fontSize: 14 },
  resendAction: { fontSize: 14, fontWeight: '700' },
});
