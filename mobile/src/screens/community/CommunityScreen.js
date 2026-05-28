import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  followUser, initAllUsers, loadMoreUsers, unfollowUser,
  selectAllUsers, selectAllUsersCurrentPage, selectAllUsersLoading,
  selectAllUsersLoadingMore, selectAllUsersTotalCount, selectAllUsersTotalPages,
  selectIsAuthenticated, selectMe, selectAuthUser, setUserInfo,
} from '@tobeatraveller/shared';
import { shadow } from '../../utils/styles';

const SORT_OPTIONS = [
  { value: 'username',    label: 'A–Z' },
  { value: 'itineraries', label: 'Most trips' },
];

const CommunityScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const me = meDetail ?? authUser;

  const users        = useSelector(selectAllUsers);
  const loading      = useSelector(selectAllUsersLoading);
  const loadingMore  = useSelector(selectAllUsersLoadingMore);
  const currentPage  = useSelector(selectAllUsersCurrentPage);
  const totalPages   = useSelector(selectAllUsersTotalPages);
  const totalCount   = useSelector(selectAllUsersTotalCount);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('username');
  const searchTimer = useRef(null);
  const hasMore = currentPage < totalPages;

  // Initial load and debounced search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      dispatch(initAllUsers({ searchName: search, sortBy, page: 1 }));
    }, search ? 400 : 0);
    return () => clearTimeout(searchTimer.current);
  }, [search, sortBy]);

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      dispatch(loadMoreUsers(currentPage + 1, search, sortBy));
    }
  };

  const handleRefresh = () => {
    dispatch(initAllUsers({ searchName: search, sortBy, page: 1 }));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Community</Text>
          {totalCount > 0 && (
            <Text style={styles.memberCount}>{totalCount} members</Text>
          )}
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchField}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by username…"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sort toggle */}
          <View style={styles.sortRow}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortChip, sortBy === opt.value && styles.sortChipSelected]}
                onPress={() => setSortBy(opt.value)}
              >
                <Text style={[styles.sortChipText, sortBy === opt.value && styles.sortChipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Guest CTA overlay */}
      {!isAuthenticated && !loading && users?.length > 0 && (
        <View style={styles.guestCta}>
          <Text style={styles.guestCtaTitle}>Join the community</Text>
          <Text style={styles.guestCtaSubtitle}>
            Sign up to follow travellers and get inspired for your next trip.
          </Text>
          <View style={styles.guestCtaBtns}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Register')}>
              <Text style={styles.primaryBtnText}>Create account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.secondaryBtnText}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={
          // Pad to even count so the last item never stretches full-width
          (users ?? []).length % 2 !== 0
            ? [...(users ?? []), { id: '__filler__' }]
            : (users ?? [])
        }
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading && !loadingMore} onRefresh={handleRefresh} tintColor="#0077b6" />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>No travellers found.</Text>
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={styles.emptyLink}>Clear search</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color="#0077b6" style={{ marginVertical: 16 }} />
            : null
        }
        renderItem={({ item }) => {
          if (item.id === '__filler__') return <View style={styles.cardWrapper} />;
          return (
            <View style={styles.cardWrapper}>
              <UserCard
                user={item}
                me={me}
                isAuthenticated={isAuthenticated}
                onPress={() => navigation.navigate('UserProfile', { id: item.id })}
              />
            </View>
          );
        }}
      />

      {loading && !users?.length && (
        <ActivityIndicator size="large" color="#0077b6" style={styles.fullLoader} />
      )}
    </View>
  );
};

const UserCard = ({ user, me, isAuthenticated, onPress }) => {
  const dispatch = useDispatch();
  const [following, setFollowing] = useState(
    !!me?.followingListIds?.some(f => String(f.id) === String(user.id))
  );
  const [loadingFollow, setLoadingFollow] = useState(false);
  const isMe = me && String(me.id) === String(user.id);

  const handleFollow = async () => {
    if (!isAuthenticated) return;
    setLoadingFollow(true);
    try {
      if (following) await unfollowUser(user.id);
      else await followUser(user.id);
      setFollowing(f => !f);
      // Keep me.followingListIds fresh so state is correct on next render
      if (me?.id) dispatch(setUserInfo(me.id));
    } catch {}
    finally { setLoadingFollow(false); }
  };

  return (
    <TouchableOpacity style={styles.userCard} onPress={onPress} activeOpacity={0.85}>
      {/* Banner with last itinerary photo */}
      <View style={styles.userCardBanner}>
        {user.lastItinerary?.photoUrl && (
          <Image source={{ uri: user.lastItinerary.photoUrl }} style={styles.userCardBannerImg} resizeMode="cover" />
        )}
        {/* Avatar */}
        <View style={styles.userCardAvatarWrapper}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.userCardAvatar} />
          ) : (
            <View style={styles.userCardAvatarFallback}>
              <Text style={styles.userCardAvatarInitial}>
                {user.username?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.userCardBody}>
        <View style={styles.userCardNameRow}>
          <Text style={styles.userCardUsername} numberOfLines={1}>@{user.username}</Text>
          {user.role === 'official' && (
            <View style={styles.officialBadge}><Text style={styles.officialText}>✓</Text></View>
          )}
        </View>

        {user.location && (
          <Text style={styles.userCardLocation} numberOfLines={1}>📍 {user.location}</Text>
        )}

        <Text style={styles.userCardTrips}>{user.totalItineraries ?? 0} trips</Text>

        {!isMe && isAuthenticated && (
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followBtnFollowing, loadingFollow && styles.followBtnDisabled]}
            onPress={handleFollow}
            disabled={loadingFollow}
          >
            <Text style={[styles.followBtnText, following && styles.followBtnTextFollowing]}>
              {loadingFollow ? '…' : following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    gap: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { padding: 4, marginRight: 4 },
  backText: { fontSize: 20, color: '#374151' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  memberCount: {
    fontSize: 12, fontWeight: '600', color: '#0077b6',
    backgroundColor: '#eff6ff', borderRadius: 999,
    paddingVertical: 2, paddingHorizontal: 8,
  },

  searchRow: { gap: 8 },
  searchInput: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    ...shadow(1, 0.04, 4, 1),
  },
  searchIcon: { fontSize: 14 },
  searchField: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },
  clearBtn: { padding: 4 },
  clearBtnText: { color: '#9ca3af', fontSize: 13 },

  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: {
    paddingVertical: 5, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  sortChipSelected: { backgroundColor: '#0077b6', borderColor: '#0077b6' },
  sortChipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  sortChipTextSelected: { color: '#fff', fontWeight: '600' },

  list: { paddingHorizontal: 12, paddingTop: 8 },
  row: { gap: 12, marginBottom: 12 },
  cardWrapper: { flex: 1 },
  cardWrapperHalf: { flex: 0, width: '47.5%' },

  fullLoader: { position: 'absolute', top: 160, alignSelf: 'center' },

  emptyState: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#6b7280', marginBottom: 8 },
  emptyLink: { fontSize: 14, color: '#0077b6', fontWeight: '600' },

  // Guest CTA
  guestCta: {
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    backgroundColor: '#fff', borderRadius: 14, alignItems: 'center',
    ...shadow(2, 0.06, 8, 2),
  },
  guestCtaTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  guestCtaSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 14 },
  guestCtaBtns: { flexDirection: 'row', gap: 10 },
  primaryBtn: { backgroundColor: '#0077b6', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 20 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryBtn: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 20 },
  secondaryBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },

  // User card
  userCard: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    ...shadow(2, 0.06, 8, 2),
  },
  userCardBanner: { height: 64, backgroundColor: '#e5e7eb', position: 'relative' },
  userCardBannerImg: { width: '100%', height: '100%' },
  userCardAvatarWrapper: {
    position: 'absolute', bottom: -18, left: 12,
    borderWidth: 3, borderColor: '#fff', borderRadius: 22,
    ...shadow(1, 0.1, 4, 2),
  },
  userCardAvatar: { width: 40, height: 40, borderRadius: 20 },
  userCardAvatarFallback: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#0077b6', alignItems: 'center', justifyContent: 'center',
  },
  userCardAvatarInitial: { color: '#fff', fontWeight: '700', fontSize: 16 },
  userCardBody: { paddingTop: 22, paddingHorizontal: 12, paddingBottom: 12 },
  userCardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  userCardUsername: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1 },
  officialBadge: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#0077b6', alignItems: 'center', justifyContent: 'center',
  },
  officialText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  userCardLocation: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  userCardTrips: { fontSize: 11, color: '#6b7280', marginBottom: 8 },
  followBtn: {
    borderWidth: 1.5, borderColor: '#0077b6', borderRadius: 999,
    paddingVertical: 5, alignItems: 'center',
  },
  followBtnFollowing: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  followBtnDisabled: { opacity: 0.5 },
  followBtnText: { fontSize: 12, fontWeight: '600', color: '#0077b6' },
  followBtnTextFollowing: { color: '#6b7280' },
});

export default CommunityScreen;
