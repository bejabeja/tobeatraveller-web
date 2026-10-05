import { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { initNotifications, selectNotifications } from '@tobeatraveller/shared';
import NotificationRow from './NotificationRow';
import { shadow } from '../utils/styles';

const MAX_NEWS = 3;

// What happened since they were last here: the notifications they have not
// seen, as the same rows as the notifications screen. The list is only read,
// not marked as seen: that happens when they open it. On every focus, since
// the Home stays under the screens where they get read.
const HomeNews = ({ navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);

  useFocusEffect(
    useCallback(() => {
      dispatch(initNotifications());
    }, [dispatch])
  );

  const news = notifications.filter((notification) => !notification.isRead);
  if (news.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{t('home.newsTitle')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
        </TouchableOpacity>
      </View>
      {news.slice(0, MAX_NEWS).map((notification) => (
        <NotificationRow key={notification.id} notification={notification} navigation={navigation} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    margin: 16, marginBottom: 0, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    ...shadow(2, 0.06, 8, 2),
  },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 4 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#E8743B' },
});

export default HomeNews;
