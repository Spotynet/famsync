import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';

import { useColorScheme } from '../../hooks/use-color-scheme';

const PRIMARY = '#22C55E';

export default function TabsLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const tabBarBg   = isDark ? '#1F2937' : '#FFFFFF';
  const inactiveColor = isDark ? '#6B7280' : '#9CA3AF';
  const borderColor   = isDark ? '#374151' : '#E5E7EB';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: borderColor,
          borderTopWidth: Platform.OS === 'android' ? 0 : 0.5,
          elevation: Platform.OS === 'android' ? 8 : 0,
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'today' : 'today-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="nuevo-evento"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: PRIMARY,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Platform.OS === 'ios' ? 12 : 16,
                shadowColor: PRIMARY,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 6,
                borderWidth: focused ? 3 : 0,
                borderColor: focused ? '#16A34A' : 'transparent',
              }}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size + 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
