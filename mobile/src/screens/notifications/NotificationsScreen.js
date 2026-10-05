import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  loadMoreNotifications, openNotifications,
  selectNotifications, selectNotificationsError, selectNotificationsLoading,
  selectNotificationsLoadingMore, selectNotificationsPage, selectNotificationsTotalPages,
} from '@tobeatraveller/shared';
import NotificationRow from '../../components/NotificationRow';
import { UserRowSkeleton } from '../../components/Skeleton';
import { shadow } from '../../utils/styles';


const NotificationsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const loading = useSelector(selectNotificationsLoading);
  const loadingMore = useSelector(selectNotificationsLoadingMore);
  const error = useSelector(selectNotificationsError);
  const page = useSelector(selectNotificationsPage);
  const totalPages = useSelector(selectNotificationsTotalPages);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(openNotifications());
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(openNotifications());
    setRefreshing(false);
  };

  // Marked as seen on opening, but still shown apart for this visit: what
  // was new is what you came to see. The headings are rows of the list.
  const fresh = notifications.filter(n => !n.isRead);
  const earlier = notifications.filter(n => n.isRead);
  const rows = fresh.length > 0
    ? [{ id: 'heading-new', heading: t('notifications.new') }, ...fresh,
      ...(earlier.length > 0 ? [{ id: 'heading-earlier', heading: t('notifications.earlier') }, ...earlier] : [])]
    : earlier;

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    dispatch(loadMoreNotifications(page + 1));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('notifications.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {Array.from({ length: 8 }, (_, i) => <UserRowSkeleton key={i} />)}
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>{t('notifications.errorMsg')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(openNotifications())}>
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>{t('notifications.noNotifications')}</Text>
          <Text style={styles.emptySub}>
            {t('notifications.noNotificationsDesc')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E8743B" />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color="#E8743B" />
          ) : null}
          renderItem={({ item: n }) => n.heading ? (
            <Text style={styles.groupTitle} accessibilityRole="header">{n.heading}</Text>
          ) : (
            <NotificationRow notification={n} navigation={navigation} />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    ...shadow(2, 0.05, 6, 2),
  },
  back: { width: 40, padding: 4 },
  backText: { fontSize: 20, color: '#374151' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#111827' },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },

  groupTitle: {
    marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: '700',
    letterSpacing: 0.5, textTransform: 'uppercase', color: '#6b7280',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  retryBtn: {
    marginTop: 8, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 999, borderWidth: 1, borderColor: '#E8743B',
  },
  retryBtnText: { color: '#E8743B', fontWeight: '700', fontSize: 14 },
});

export default NotificationsScreen;
