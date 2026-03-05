import { Stack } from 'expo-router';

export default function SetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="rol-color" />
      <Stack.Screen name="calendarios" />
    </Stack>
  );
}
