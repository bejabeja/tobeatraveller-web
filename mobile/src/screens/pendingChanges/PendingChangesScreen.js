import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { discardChange, retryAllFailedChanges, retryChange, UNCONFIRMED_ERROR_CODE } from '../../offline/outbox';
import { CHANGE_STATUS } from '../../offline/pendingChanges';
import { useOutbox } from '../../offline/useOutbox';
import { shadow } from '../../utils/styles';

const PendingChangesScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { changes, failedCount, syncing } = useOutbox();

  const confirmDiscard = (change) => {
    Alert.alert(t('offline.discardConfirmTitle'), t('offline.discardConfirmDesc'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('offline.discard'), style: 'destructive', onPress: () => discardChange(change.id) },
    ]);
  };

  const renderChange = ({ item: change }) => {
    const failed = change.status === CHANGE_STATUS.FAILED;
    return (
      <View style={styles.change}>
        <View style={styles.changeTop}>
          <Text style={styles.changeMeta}>
            {t(`offline.collection.${change.collection}`)} · {t(`offline.kind.${change.kind}`)}
          </Text>
          <Text style={[styles.status, failed && styles.statusFailed]}>
            {failed ? t('offline.statusFailed') : t('offline.statusPending')}
          </Text>
        </View>
        {change.label ? <Text style={styles.changeLabel}>{change.label}</Text> : null}
        {failed && change.errorCode === UNCONFIRMED_ERROR_CODE
          ? <Text style={styles.error}>{t('offline.actionUnconfirmed')}</Text>
          : null}
        {failed && change.error ? <Text style={styles.error}>{change.error}</Text> : null}
        <View style={styles.actions}>
          {failed && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => retryChange(change.id)}>
              <Ionicons name="refresh-outline" size={15} color="#E8743B" />
              <Text style={styles.retryText}>{t('offline.retry')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDiscard(change)}>
            <Ionicons name="trash-outline" size={15} color="#ef4444" />
            <Text style={styles.discardText}>{t('offline.discard')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={t('common.back')}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('offline.screenTitle')}</Text>
          {failedCount > 1 && (
            <TouchableOpacity style={styles.retryAllBtn} onPress={retryAllFailedChanges} disabled={syncing}>
              <Text style={styles.retryAllText}>{t('offline.retryAll')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.desc}>{t('offline.screenDesc')}</Text>
      </View>

      <FlatList
        data={changes}
        keyExtractor={change => change.id}
        renderItem={renderChange}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#16a34a" />
            <Text style={styles.emptyText}>{t('offline.allSynced')}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
    ...shadow(2, 0.05, 6, 2),
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  backBtn: { marginRight: 10, padding: 4 },
  backText: { fontSize: 20, color: '#374151' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: '#111827' },
  desc: { paddingHorizontal: 16, fontSize: 13, color: '#6b7280' },
  retryAllBtn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  retryAllText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { padding: 16, gap: 10 },
  change: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    ...shadow(1, 0.05, 4, 1),
  },
  changeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  changeMeta: { fontSize: 12, fontWeight: '700', color: '#6b7280', flexShrink: 1 },
  status: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  statusFailed: { color: '#b91c1c' },
  changeLabel: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 6 },
  error: { fontSize: 13, color: '#b91c1c', marginTop: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retryText: { color: '#E8743B', fontWeight: '700', fontSize: 13 },
  discardText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: '#374151', fontWeight: '600' },
});

export default PendingChangesScreen;
