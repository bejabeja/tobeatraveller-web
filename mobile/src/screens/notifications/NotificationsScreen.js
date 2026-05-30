import { useEffect } from 'react';
import {
  FlatList, Image, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  initNotifications, markAllNotificationsRead,
  selectNotifications, selectNotificationsLoading, selectUnreadCount,
} from '@tobeatraveller/shared';
import { UserRowSkeleton } from '../../components/Skeleton';
import { shadow } from '../../utils/styles';

const TYPE_ICON = { follow: '👤', like: '❤️', comment: '💬' };

const NotificationsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const loading = useSelector(selectNotificationsLoading);
  const unreadCount = useSelector(selectUnreadCount);

  useEffect(() => {
    dispatch(initNotifications());
  }, [dispatch]);

  useEffect(() => {
    if (unreadCount > 0) dispatch(markAllNotificationsRead());
  }, [unreadCount, dispatch]);

  const handlePress = (n) => {
    if (n.type === 'follow') navigation.navigate('UserProfile', { id: n.actor?.id });
    else if (n.itinerary?.id) navigation.navigate('Itinerary', { id: n.itinerary.id });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('notifications.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {Array.from({ length: 8 }, (_, i) => <UserRowSkeleton key={i} />)}
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
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: n }) => (
            <TouchableOpacity
              style={[styles.item, !n.isRead && styles.itemUnread]}
              onPress={() => handlePress(n)}
              activeOpacity={0.8}
            >
              <View style={styles.avatarWrap}>
                <Image
                  source={{ uri: n.actor?.avatarUrl }}
                  style={styles.avatar}
                  onError={() => {}}
                />
                <View style={styles.typeIcon}>
                  <Text style={styles.typeIconText}>{TYPE_ICON[n.type] || '🔔'}</Text>
                </View>
              </View>
              <View style={styles.body}>
                <Text style={styles.text} numberOfLines={2}>
                  <Text style={styles.bold}>@{n.actor?.username}</Text>
                  {n.type === 'follow' && t('notifications.startedFollowing')}
                  {n.type === 'like' && <Text>{t('notifications.liked')}<Text style={styles.italic}>{n.itinerary?.title}</Text></Text>}
                  {n.type === 'comment' && <Text>{t('notifications.commented')}<Text style={styles.italic}>{n.itinerary?.title}</Text></Text>}
                </Text>
                <Text style={styles.time}>{n.createdAt}</Text>
              </View>
              {!n.isRead && <View style={styles.dot} />}
            </TouchableOpacity>
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

  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  itemUnread: { backgroundColor: '#FFF0E8', marginHorizontal: -16, paddingHorizontal: 16 },

  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#e5e7eb' },
  typeIcon: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  typeIconText: { fontSize: 11 },

  body: { flex: 1 },
  text: { fontSize: 14, color: '#374151', lineHeight: 19 },
  bold: { fontWeight: '700', color: '#111827' },
  italic: { color: '#6b7280' },
  time: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E8743B', flexShrink: 0,
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});

export default NotificationsScreen;
