import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOutbox } from '../offline/useOutbox';

// Offline, the global OfflineBanner already says changes are waiting; this
// covers what it doesn't: changes syncing now, and changes that failed.
export const PendingChangesNotice = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isConnected } = useNetworkStatus();
  const { pendingCount, failedCount, syncing } = useOutbox();

  const failed = failedCount > 0;
  if (!failed && (pendingCount === 0 || !isConnected)) return null;

  const message = failed
    ? t('offline.failedNotice', { count: failedCount })
    : t(syncing ? 'offline.syncing' : 'offline.pendingNotice', { count: pendingCount });

  return (
    <TouchableOpacity
      style={[styles.notice, failed && styles.noticeFailed]}
      onPress={() => navigation.navigate('PendingChanges')}
      accessibilityRole="button"
    >
      <Ionicons name={failed ? 'alert-circle-outline' : 'cloud-upload-outline'} size={16} color={failed ? '#b91c1c' : '#92400e'} />
      <Text style={[styles.text, failed && styles.textFailed]}>{message}</Text>
      <Ionicons name="chevron-forward" size={14} color={failed ? '#b91c1c' : '#92400e'} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
  },
  noticeFailed: { backgroundColor: '#fee2e2' },
  text: { flex: 1, fontSize: 12, fontWeight: '600', color: '#92400e' },
  textFailed: { color: '#b91c1c' },
});
