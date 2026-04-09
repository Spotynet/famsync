import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export default function CalendarConnectedScreen() {
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

    const timeout = setTimeout(() => {
      router.replace('/(tabs)/perfil');
    }, 150);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color="#22C55E" />
      <Text style={s.text}>Conectando Google Calendar...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
});
