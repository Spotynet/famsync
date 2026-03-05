import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../lib/googleAuth';

export default function RegisterScreen() {
  const { loginWithGoogle, requestEmailOTP, verifyEmailOTP } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'choose' | 'email' | 'verify'>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (!email.trim()) {
      setError('Introduce tu correo electrónico');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestEmailOTP(email.trim());
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!code.trim() || code.trim().length !== 6) {
      setError('Introduce el código de 6 dígitos');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyEmailOTP(email.trim(), code.trim());
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {step === 'choose' && (
          <>
            <Text style={styles.title}>Registrarse</Text>
            <Text style={styles.subtitle}>
              Usa Google o tu correo para crear una cuenta
            </Text>

            <Pressable
              style={[styles.button, styles.emailButton]}
              onPress={() => setStep('email')}
              disabled={loading}
            >
              <Text style={styles.emailButtonText}>Continuar con correo</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.googleButton]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              )}
            </Pressable>
          </>
        )}

        {step === 'email' && (
          <>
            <Text style={styles.title}>Introduce tu correo</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor="#687076"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={handleRequestOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Enviar código</Text>
              )}
            </Pressable>
            <Pressable style={styles.backLink} onPress={handleBack}>
              <Text style={styles.backLinkText}>Volver</Text>
            </Pressable>
          </>
        )}

        {step === 'verify' && (
          <>
            <Text style={styles.title}>Código de verificación</Text>
            <Text style={styles.subtitle}>
              Hemos enviado un código a {email}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              placeholderTextColor="#687076"
              value={code}
              onChangeText={(t) => {
                setCode(t.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
            />
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={handleVerifyOTP}
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Verificar</Text>
              )}
            </Pressable>
            <Pressable style={styles.backLink} onPress={handleBack}>
              <Text style={styles.backLinkText}>Volver</Text>
            </Pressable>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.footerLinks}>
          <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
          <Link href="/login" asChild>
            <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Text style={styles.footerLinkText}>Iniciar sesión</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#687076',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emailButton: {
    backgroundColor: '#f0f0f0',
  },
  emailButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  backLink: {
    alignSelf: 'center',
    padding: 12,
  },
  backLinkText: {
    color: '#0a7ea4',
    fontSize: 16,
  },
  error: {
    color: '#c00',
    textAlign: 'center',
    marginTop: 16,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 16,
    gap: 4,
  },
  footerText: {
    fontSize: 15,
    color: '#6B7280',
  },
  footerLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22C55E',
  },
});
