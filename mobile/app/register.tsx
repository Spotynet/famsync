import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function RegisterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Pantalla de registro (placeholder)</Text>
      <Text style={styles.hint}>Conexión con backend pendiente.</Text>
      <Link href="/" style={styles.back}>
        Volver al inicio
      </Link>
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
  placeholder: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#687076',
    marginBottom: 24,
  },
  back: {
    fontSize: 16,
    color: '#0a7ea4',
  },
});
