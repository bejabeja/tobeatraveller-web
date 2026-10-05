import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  BADGE_EMOJI, PASSPORT_SHARE_MOMENT, RECAP_SOURCES, countryFlag, countryName, formatTimeAgo,
} from '@tobeatraveller/shared';

const TYPE_ICON = { follow: '👤', like: '❤️', comment: '💬', referral_reward: '🎁', badge_earned: '🏅', country_stamp: '🛂', recap_ready: '🎉', friend_stamp: '🛂', trip_packing: '🎒' };

// One notification as a row, shared by the notifications screen and the news
// on the Home, so what each type says and where it leads stay in one place.
const NotificationRow = ({ notification: n, navigation }) => {
  const { t, i18n } = useTranslation();

  const handlePress = () => {
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
            <TouchableOpacity
              style={[styles.item, !n.isRead && styles.itemUnread]}
              onPress={handlePress}
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
                  ) : n.type === 'trip_packing' ? (
                    <Text><Text style={styles.bold}>{n.itinerary?.title}</Text>{t('notifications.tripPacking')}</Text>
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
                <Text style={styles.time}>{n.lastActivityAt ? formatTimeAgo(t, n.lastActivityAt) : n.postedAgo}</Text>
              </View>
              {!n.isRead && <View style={styles.dot} />}
            </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
});

export default NotificationRow;
