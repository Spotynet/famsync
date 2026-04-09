import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '../../hooks/use-color-scheme';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
  icon,
}: ConfirmModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const bg         = isDark ? '#1F2937' : '#FFFFFF';
  const textColor  = isDark ? '#F9FAFB' : '#111827';
  const mutedColor = isDark ? '#9CA3AF' : '#6B7280';
  const overlayBg  = 'rgba(0,0,0,0.52)';
  const accent     = danger ? '#EF4444' : '#22C55E';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={[s.overlay, { backgroundColor: overlayBg }]} onPress={onCancel}>
        <Pressable style={[s.card, { backgroundColor: bg }]} onPress={e => e.stopPropagation()}>
          {/* Icon circle */}
          {icon && (
            <View style={[s.iconWrap, { backgroundColor: `${accent}18` }]}>
              <Ionicons name={icon} size={26} color={accent} />
            </View>
          )}

          {/* Title */}
          <Text style={[s.title, { color: textColor }]}>{title}</Text>

          {/* Message */}
          {message && (
            <Text style={[s.message, { color: mutedColor }]}>{message}</Text>
          )}

          {/* Buttons */}
          <View style={s.btnRow}>
            <Pressable
              style={({ pressed }) => [
                s.btn, s.cancelBtn,
                { borderColor: isDark ? '#374151' : '#E5E7EB' },
                pressed && s.pressed,
              ]}
              onPress={onCancel}
            >
              <Text style={[s.btnText, { color: mutedColor }]}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                s.btn,
                { backgroundColor: accent },
                pressed && s.pressed,
              ]}
              onPress={onConfirm}
            >
              <Text style={[s.btnText, { color: '#fff' }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1.5,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
