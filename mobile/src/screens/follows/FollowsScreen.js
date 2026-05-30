import { useEffect, useState } from 'react';
import {
  FlatList, Image, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  followUser, getAllFollowers, getAllFollowing, unfollowUser,
  selectIsAuthenticated, selectMe, selectAuthUser, setUserInfo,
} from '@tobeatraveller/shared';
import { UserRowSkeleton } from '../../components/Skeleton';
import { shadow } from '../../utils/styles';

// type: 'followers' | 'following'
const FollowsScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { userId, type } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const me = meDetail ?? authUser;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.replace('Tabs', { screen: 'Profile' });
      return;
    }
    (async () => {
      try {
        const data = type === 'followers'
          ? await getAllFollowers(userId)
          : await getAllFollowing(userId);
        setUsers(data ?? []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [userId, type, isAuthenticated]);

  if (!isAuthenticated) return null;

  const title = type === 'followers' ? t('followers.title') : t('profile.following');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {Array.from({ length: 8 }, (_, i) => <UserRowSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{type === 'followers' ? '👥' : '🔭'}</Text>
              <Text style={styles.emptyText}>
                {type === 'followers' ? t('followers.noFollowers') : t('followers.notFollowingAnyone')}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <UserRow
              user={item}
              me={me}
              dispatch={dispatch}
              onPress={() => navigation.navigate('UserProfile', { id: item.id })}
            />
          )}
        />
      )}
    </View>
  );
};

const UserRow = ({ user, me, dispatch, onPress }) => {
  const { t } = useTranslation();
  const isMe = me && String(me.id) === String(user.id);
  const [following, setFollowing] = useState(
    !!me?.followingListIds?.some(f => String(f.id) === String(user.id))
  );
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    try {
      if (following) await unfollowUser(user.id);
      else await followUser(user.id);
      setFollowing(f => !f);
      if (me?.id) dispatch(setUserInfo(me.id));
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      {/* Avatar */}
      {user.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>
            {user.username?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.userInfo}>
        {user.name ? <Text style={styles.userName}>{user.name}</Text> : null}
        <Text style={styles.userHandle}>@{user.username}</Text>
        {user.totalItineraries > 0 && (
          <Text style={styles.userTrips}>{t('followers.trips', { count: user.totalItineraries })}</Text>
        )}
      </View>

      {/* Follow button */}
      {!isMe && (
        <TouchableOpacity
          style={[styles.followBtn, following && styles.followBtnActive, loading && styles.btnDisabled]}
          onPress={handleFollow}
          disabled={loading}
        >
          <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
            {loading ? '…' : following ? t('followers.following') : t('followers.follow')}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: '#111827' },

  list: { paddingHorizontal: 16, paddingTop: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  avatarFallback: { backgroundColor: '#0077b6', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: '700' },

  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  userHandle: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  userTrips: { fontSize: 12, color: '#9ca3af', marginTop: 1 },

  followBtn: {
    borderWidth: 1.5, borderColor: '#0077b6', borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 16,
  },
  followBtnActive: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  btnDisabled: { opacity: 0.5 },
  followBtnText: { fontSize: 13, fontWeight: '600', color: '#0077b6' },
  followBtnTextActive: { color: '#6b7280' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#6b7280' },
});

export default FollowsScreen;
