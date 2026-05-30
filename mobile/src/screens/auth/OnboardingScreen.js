import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, ImageBackground,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { followUser, getSuggestedUsers, selectAuthUser, setUserInfo, unfollowUser } from '@tobeatraveller/shared';
import { useDispatch, useSelector } from 'react-redux';
import { shadow } from '../../utils/styles';

const DOTS = 3;

const OnboardingScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const authUser = useSelector(selectAuthUser);
  const [users, setUsers] = useState([]);
  const [following, setFollowing] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const count = following.size;
  const canContinue = count >= 1;

  const handleFinish = () => {
    if (authUser?.id) dispatch(setUserInfo(authUser.id));
    navigation.replace('Tabs');
  };

  useEffect(() => {
    getSuggestedUsers().then(data => {
      setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const toggleFollow = async (userId) => {
    const isFollowing = following.has(userId);
    setFollowing(prev => {
      const next = new Set(prev);
      isFollowing ? next.delete(userId) : next.add(userId);
      return next;
    });
    try {
      isFollowing ? await unfollowUser(userId) : await followUser(userId);
    } catch {
      setFollowing(prev => {
        const next = new Set(prev);
        isFollowing ? next.add(userId) : next.delete(userId);
        return next;
      });
    }
  };

  const progressLabel = count === 0
    ? t('onboarding.followPrompt')
    : count >= DOTS
    ? t('onboarding.readyToGo')
    : t('onboarding.followedCount', { count });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Hero */}
      <LinearGradient
        colors={['#E8743B', '#1A535C']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroEmoji}>🌍</Text>
        <Text style={styles.title}>{t('onboarding.welcomeTitle')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>
      </LinearGradient>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress dots */}
        <View style={styles.progress}>
          <View style={styles.dots}>
            {Array.from({ length: DOTS }, (_, i) => (
              <View key={i} style={[styles.dot, i < count && styles.dotFilled]} />
            ))}
          </View>
          <Text style={styles.progressLabel}>{progressLabel}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E8743B" style={styles.loader} />
        ) : (
          <View style={styles.grid}>
            {users.map(user => (
              <UserCard
                key={user.id}
                user={user}
                isFollowing={following.has(user.id)}
                onToggle={() => toggleFollow(user.id)}
                t={t}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Fixed footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, !canContinue && styles.ctaBtnLocked]}
          onPress={handleFinish}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaBtnText, !canContinue && styles.ctaBtnTextLocked]}>
            {canContinue ? t('onboarding.continue') : t('onboarding.followPromptBtn')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleFinish} activeOpacity={0.7}>
          <Text style={styles.skip}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const UserCard = ({ user, isFollowing, onToggle, t }) => {
  const [avatarError, setAvatarError] = useState(false);
  const photo = user.lastItinerary?.photoUrl;
  const destination = user.lastItinerary?.location?.name || user.lastItinerary?.title;
  const initial = user.username?.charAt(0).toUpperCase() || '?';

  return (
    <View style={[styles.card, isFollowing && styles.cardFollowing]}>
      {/* Photo header */}
      {photo ? (
        <ImageBackground source={{ uri: photo }} style={styles.cardPhoto} resizeMode="cover">
          <View style={styles.cardOverlay} />
          <AvatarBadge user={user} avatarError={avatarError} setAvatarError={setAvatarError} initial={initial} />
        </ImageBackground>
      ) : (
        <LinearGradient colors={['#E8743B', '#1A535C']} style={styles.cardPhoto}>
          <AvatarBadge user={user} avatarError={avatarError} setAvatarError={setAvatarError} initial={initial} />
        </LinearGradient>
      )}

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.username} numberOfLines={1}>@{user.username}</Text>
        {destination && (
          <Text style={styles.destination} numberOfLines={1}>✈️ {destination}</Text>
        )}
        <Text style={styles.trips}>{t('onboarding.trips', { count: user.totalItineraries ?? 0 })}</Text>
        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followBtnActive]}
          onPress={onToggle}
          activeOpacity={0.8}
        >
          <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
            {isFollowing ? t('onboarding.following') : t('onboarding.follow')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AvatarBadge = ({ user, avatarError, setAvatarError, initial }) => (
  <View style={styles.avatarWrap}>
    {user.avatarUrl && !avatarError ? (
      <Image
        source={{ uri: user.avatarUrl }}
        style={styles.avatar}
        resizeMode="cover"
        onError={() => setAvatarError(true)}
      />
    ) : (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarInitial}>{initial}</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  hero: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 40, marginBottom: 10 },
  title: {
    fontSize: 22, fontWeight: '800', color: '#fff',
    letterSpacing: -0.4, textAlign: 'center', marginBottom: 6,
  },
  subtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 20, maxWidth: 280,
  },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },

  progress: { alignItems: 'center', gap: 8, marginBottom: 20 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, borderColor: '#E8743B', backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: '#E8743B' },
  progressLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  loader: { marginTop: 40 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  card: {
    width: '47.5%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    ...shadow(2, 0.06, 8, 3),
  },
  cardFollowing: {
    borderColor: '#E8743B',
    ...shadow(0, 0.12, 0, 4),
  },

  cardPhoto: {
    height: 90,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  avatarWrap: {
    position: 'absolute',
    bottom: -22,
    alignSelf: 'center',
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#fff',
    ...shadow(2, 0.1, 6, 2),
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E8743B', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: '700' },

  cardBody: {
    paddingTop: 28, paddingBottom: 12, paddingHorizontal: 10,
    alignItems: 'center', gap: 3,
  },
  username: { fontSize: 13, fontWeight: '700', color: '#111827', maxWidth: '100%' },
  destination: { fontSize: 11, color: '#6b7280', maxWidth: '100%' },
  trips: { fontSize: 11, color: '#9ca3af' },

  followBtn: {
    marginTop: 6,
    width: '100%',
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5, borderColor: '#E8743B',
    alignItems: 'center',
  },
  followBtnActive: { backgroundColor: '#E8743B' },
  followBtnText: { fontSize: 12, fontWeight: '700', color: '#E8743B' },
  followBtnTextActive: { color: '#fff' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    paddingHorizontal: 24, paddingTop: 14,
    alignItems: 'center', gap: 8,
  },
  ctaBtn: {
    width: '100%', backgroundColor: '#E8743B',
    borderRadius: 999, paddingVertical: 14, alignItems: 'center',
  },
  ctaBtnLocked: {
    backgroundColor: '#e5e7eb',
  },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ctaBtnTextLocked: { color: '#9ca3af' },
  skip: { fontSize: 13, color: '#9ca3af' },
});

export default OnboardingScreen;
