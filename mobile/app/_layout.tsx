import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '../hooks/use-color-scheme';
import { AuthProvider } from '../contexts/AuthContext';
import { EventsProvider } from '../contexts/EventsContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
    <EventsProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Bienvenido', headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="login" options={{ title: 'Iniciar sesión', headerShown: false }} />
        <Stack.Screen name="setup" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Registrarse' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
    </EventsProvider>
    </AuthProvider>
  );
}
