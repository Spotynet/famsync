import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido a Famsync</Text>
      <View style={styles.links}>
        <Link href="/login" style={styles.link}>
          Iniciar sesión
        </Link>
        <Link href="/register" style={styles.link}>
          Registrarse
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  links: {
    gap: 16,
    alignItems: 'center',
  },
  link: {
    fontSize: 16,
    color: '#0a7ea4',
  },
});
