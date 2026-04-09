import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export default function CalendarErrorScreen() {
  const { error } = useLocalSearchParams<{ error?: string }>();

  useEffect(() => {
    try {
      WebBrowser.dismissAuthSession();
    } catch {
      // Ignore unsupported platform errors.
    }
    try {
      WebBrowser.dismissBrowser();
    } catch {
      // Ignore unsupported platform errors.
    }
  }, []);

  return (
    <View style={s.container}>
      <Text style={s.title}>No se pudo conectar Google Calendar</Text>
      <Text style={s.message}>
        {error ? `Motivo: ${error}` : 'La conexion fue cancelada o fallo durante el callback.'}
      </Text>
      <Pressable style={s.button} onPress={() => router.replace('/(tabs)/perfil')}>
        <Text style={s.buttonText}>Volver al perfil</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#22C55E',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
