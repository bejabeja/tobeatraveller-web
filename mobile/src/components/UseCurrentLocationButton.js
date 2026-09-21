import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export const UseCurrentLocationButton = ({ onPress, loading, color = '#E8743B' }) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={loading}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {loading
        ? <ActivityIndicator size="small" color={color} />
        : <Ionicons name="locate-outline" size={14} color={color} />}
      <Text style={[styles.text, { color }]}>{t('common.useMyLocation')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingTop: 8, paddingBottom: 2 },
  text: { fontSize: 12.5, fontWeight: '600' },
});
