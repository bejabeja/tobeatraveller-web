import { useEffect } from 'react';
import {
  ActivityIndicator, FlatList, Image, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  BADGE_EMOJI, PASSPORT_SHARE_MOMENT, countryFlag, countryName,
  initNotifications, loadMoreNotifications, markAllNotificationsRead,
  selectNotifications, selectNotificationsError, selectNotificationsLoading,
  RECAP_SOURCES, selectNotificationsLoadingMore, selectNotificationsPage, selectNotificationsTotalPages, selectUnreadCount,
} from '@tobeatraveller/shared';
import { UserRowSkeleton } from '../../components/Skeleton';
import { shadow } from '../../utils/styles';

const TYPE_ICON = { follow: '👤', like: '❤️', comment: '💬', referral_reward: '🎁', badge_earned: '🏅', country_stamp: '🛂', recap_ready: '🎉', friend_stamp: '🛂' };

const NotificationsScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const loading = useSelector(selectNotificationsLoading);
  const loadingMore = useSelector(selectNotificationsLoadingMore);
  const error = useSelector(selectNotificationsError);
  const page = useSelector(selectNotificationsPage);
  const totalPages = useSelector(selectNotificationsTotalPages);
  const unreadCount = useSelector(selectUnreadCount);

  useEffect(() => {
    dispatch(initNotifications());
  }, [dispatch]);

  useEffect(() => {
    if (unreadCount > 0) dispatch(markAllNotificationsRead());
  }, [unreadCount, dispatch]);

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    dispatch(loadMoreNotifications(page + 1));
  };

  const handlePress = (n) => {
    if (n.type === 'follow') navigation.navigate('UserProfile', { id: n.actor?.id });
    // Opens the card of that badge or country ready to share: the moment they most want to show it off.
    else if (n.type === 'badge_earned') navigation.navigate('Passport', { userId: n.actor?.id, share: PASSPORT_SHARE_MOMENT, badge: n.badgeId });
    else if (n.type === 'country_stamp') navigation.navigate('Passport', { userId: n.actor?.id, share: PASSPORT_SHARE_MOMENT, country: n.countryCode });
    else if (n.type === 'friend_stamp') navigation.navigate('Passport', { userId: n.actor?.id });
    else if (n.type === 'recap_ready') navigation.navigate('Recap', { from: RECAP_SOURCES.NOTIFICATION });
    else if (n.type === 'referral_reward') navigation.navigate('Referral');
    else if (n.itinerary?.id) {
      navigation.navigate('Itinerary', {
        id: n.itinerary.id,
        commentId: n.type === 'comment' ? n.commentId : undefined,
      });
    }
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

      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {Array.from({ length: 8 }, (_, i) => <UserRowSkeleton key={i} />)}
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>{t('notifications.errorMsg')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(initNotifications())}>
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
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color="#E8743B" />
          ) : null}
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
                  {n.type === 'badge_earned' ? (
                    <Text>{BADGE_EMOJI[n.badgeId]} {t('notifications.badgeEarned')}<Text style={styles.bold}>{t(`badges.${n.badgeId}.name`)}</Text></Text>
                  ) : n.type === 'recap_ready' ? (
                    <Text>{t('notifications.recapReady')}<Text style={styles.bold}>{t('notifications.recapReadyCta')}</Text></Text>
                  ) : n.type === 'country_stamp' ? (
                    <Text>{t('notifications.countryStamp')}<Text style={styles.bold}>{countryFlag(n.countryCode)} {countryName(n.countryCode, i18n.language)}</Text></Text>
                  ) : (
                    <>
                      <Text style={styles.bold}>@{n.actor?.username}</Text>
                      {n.count > 1 && t('notifications.andOthers', { count: n.count - 1 })}
                      {n.type === 'follow' && t(`notifications.startedFollowing${n.count > 1 ? 'Plural' : ''}`)}
                      {n.type === 'like' && <Text>{t(`notifications.liked${n.count > 1 ? 'Plural' : ''}`)}<Text style={styles.italic}>{n.itinerary?.title}</Text></Text>}
                      {n.type === 'comment' && <Text>{t(`notifications.commented${n.count > 1 ? 'Plural' : ''}`)}<Text style={styles.italic}>{n.itinerary?.title}</Text></Text>}
                      {n.type === 'referral_reward' && <Text> {t('notifications.referralRewardMiddle')} {t('notifications.referralRewardSuffix')}</Text>}
                      {n.type === 'friend_stamp' && (n.countryCode
                        ? <Text>{t(`notifications.friendAddedCountry${n.count > 1 ? 'Plural' : ''}`)}<Text style={styles.bold}>{countryFlag(n.countryCode)} {countryName(n.countryCode, i18n.language)}</Text></Text>
                        : <Text>{t(`notifications.friendEarnedBadge${n.count > 1 ? 'Plural' : ''}`)}<Text style={styles.bold}>{BADGE_EMOJI[n.badgeId]} {t(`badges.${n.badgeId}.name`)}</Text></Text>)}
                    </>
                  )}
                </Text>
                <Text style={styles.time}>{n.postedAgo}</Text>
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
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  retryBtn: {
    marginTop: 8, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 999, borderWidth: 1, borderColor: '#E8743B',
  },
  retryBtnText: { color: '#E8743B', fontWeight: '700', fontSize: 14 },
});

export default NotificationsScreen;
