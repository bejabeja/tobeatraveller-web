import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOutbox } from '../offline/useOutbox';

export const OfflineBanner = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetworkStatus();
  const { pendingCount } = useOutbox();

  if (isConnected) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <Text style={styles.text}>
        {pendingCount > 0 ? t('offline.offlineWithPending', { count: pendingCount }) : t('common.offlineBanner')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: 6,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
