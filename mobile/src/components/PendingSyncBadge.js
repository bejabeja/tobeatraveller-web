import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export const PendingSyncBadge = ({ item }) => {
  const { t } = useTranslation();
  if (!item?._pending) return null;

  const failed = item._syncFailed;
  return (
    <View style={[styles.badge, failed && styles.badgeFailed]}>
      <Ionicons name={failed ? 'alert-circle-outline' : 'cloud-upload-outline'} size={12} color={failed ? '#b91c1c' : '#92400e'} />
      <Text style={[styles.text, failed && styles.textFailed]}>
        {failed ? t('offline.notSynced') : t('offline.pendingSync')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#fef3c7',
  },
  badgeFailed: { backgroundColor: '#fee2e2' },
  text: { fontSize: 11, fontWeight: '600', color: '#92400e' },
  textFailed: { color: '#b91c1c' },
});
