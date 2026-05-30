import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Image, Platform, ScrollView, Share,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

// Map only on native — react-native-maps doesn't support web
const MapView = Platform.OS !== 'web' ? require('react-native-maps').default : null;
const Marker  = Platform.OS !== 'web' ? require('react-native-maps').Marker  : null;
import { ItineraryDetailSkeleton } from '../../components/Skeleton';
import { COLORS, shadow, textShadow } from '../../utils/styles';
import { getStepConfig } from '../../utils/stepConfig';
import {
  addComment, addFavorite, checkIsFavorite, deleteComment,
  deleteItinerary, getCommentsByItineraryId, getCurrencySymbol,
  getItineraryById, getUserById, removeFavorite,
  selectIsAuthenticated, selectMe,
} from '@tobeatraveller/shared';

const formatBudget = (budget) => {
  const n = parseFloat(budget);
  if (isNaN(n)) return budget;
  return n % 1 === 0 ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const ItineraryScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const { t } = useTranslation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const me = useSelector(selectMe);

  const insets = useSafeAreaInsets();

  const [itinerary, setItinerary] = useState(null);
  const [author, setAuthor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getItineraryById(id);
        setItinerary(data);
        if (data?.userId) {
          const user = await getUserById(data.userId);
          setAuthor(user);
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => {
    if (!itinerary?.id) return;
    getCommentsByItineraryId(itinerary.id).then(setComments).catch(() => {});
    if (isAuthenticated) {
      checkIsFavorite(itinerary.id).then(setIsFavorite).catch(() => {});
    }
  }, [itinerary?.id, isAuthenticated]);

  if (loading) return <ScrollView style={styles.container}><ItineraryDetailSkeleton /></ScrollView>;
  if (!itinerary) return <Text style={styles.errorText}>{t('itinerary.itineraryNotFound')}</Text>;

  const isMyItinerary = me?.id === itinerary.userId;
  const currencySymbol = getCurrencySymbol(itinerary.currency);
  const budget = parseFloat(itinerary.budget);
  const perPerson = itinerary.numberOfPeople > 1 && !isNaN(budget)
    ? formatBudget(budget / itinerary.numberOfPeople)
    : null;

  const handleShare = async () => {
    try {
      await Share.share({ message: itinerary.title, title: itinerary.title });
    } catch {}
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) { navigation.navigate('Tabs', { screen: 'Profile' }); return; }
    try {
      if (isFavorite) await removeFavorite(itinerary.id);
      else await addFavorite(itinerary.id);
      setIsFavorite(f => !f);
    } catch {
      Alert.alert(t('errors.somethingWrong'), t('itinerary.errorFavorite'));
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('itinerary.deleteAlert'),
      t('itinerary.deleteAlertDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            try {
              await deleteItinerary(itinerary.id);
              navigation.goBack();
            } catch {
              Alert.alert(t('errors.somethingWrong'), t('itinerary.errorDelete'));
            }
          },
        },
      ],
    );
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const created = await addComment(itinerary.id, commentText.trim());
      setComments(prev => [...prev, created]);
      setCommentText('');
    } catch {} finally { setSubmitting(false); }
  };

  const handleDeleteComment = (commentId) => {
    Alert.alert(t('itinerary.deleteCommentAlert'), t('itinerary.deleteCommentDesc'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
          } catch {}
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.heroContainer}>
        <Image source={{ uri: itinerary.photoUrl }} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']}
          locations={[0.3, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />

        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>

        <View style={[styles.heroActions, { top: insets.top + 12 }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Text style={styles.actionIcon}>⤴</Text>
          </TouchableOpacity>
          {isMyItinerary ? (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('EditItinerary', { id: itinerary.id })}
              >
                <Text style={styles.actionIcon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleDelete}>
                <Text style={styles.actionIcon}>🗑</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, isFavorite && styles.actionBtnSaved]} onPress={handleFavorite}>
              <Text style={styles.actionIcon}>{isFavorite ? '🔖' : '📌'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.heroContent}>
          {itinerary.category && itinerary.category !== 'other' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{itinerary.category}</Text>
            </View>
          )}
          <Text style={styles.heroTitle}>{itinerary.title}</Text>
          <View style={styles.heroMeta}>
            <TouchableOpacity
              style={styles.authorRow}
              onPress={() => !isMyItinerary && navigation.navigate('UserProfile', { id: author?.id })}
              activeOpacity={isMyItinerary ? 1 : 0.7}
            >
              <View style={styles.authorAvatar}>
                {author?.avatarUrl
                  ? <Image source={{ uri: author.avatarUrl }} style={styles.authorAvatarImg} />
                  : <Text style={styles.authorAvatarInitial}>{author?.username?.charAt(0).toUpperCase()}</Text>
                }
              </View>
              {author?.username && <Text style={styles.authorName}>@{author.username}</Text>}
            </TouchableOpacity>
            {itinerary.tripDates && (
              <Text style={styles.heroDate}>📅 {itinerary.tripDates}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* About */}
        {itinerary.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('itinerary.aboutTrip')}</Text>
            <Text style={styles.description}>{itinerary.description}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          {itinerary.location?.name && (
            <StatCard icon="📍" label={t('itinerary.destination')} value={itinerary.location.name} />
          )}
          <StatCard
            icon="🗓"
            label={t('itinerary.duration')}
            value={`${itinerary.tripTotalDays} ${itinerary.tripTotalDays === 1 ? t('itinerary.day') : t('itinerary.days')}`}
          />
          <StatCard
            icon="💰"
            label={t('itinerary.budget')}
            value={`${formatBudget(itinerary.budget)} ${currencySymbol || itinerary.currency}`}
            subvalue={perPerson ? `${currencySymbol || ''}${perPerson}${t('itinerary.perPerson')}` : null}
          />
          <StatCard
            icon="👥"
            label={t('itinerary.travelers')}
            value={`${itinerary.numberOfPeople} ${itinerary.numberOfPeople === 1 ? t('itinerary.person') : t('itinerary.people')}`}
          />
        </View>

        {/* Places — timeline */}
        {itinerary.places?.length > 0 && (() => {
          const dayMap = {};
          itinerary.places.forEach((place, i) => {
            const day = place.dayNumber ?? 1;
            if (!dayMap[day]) dayMap[day] = [];
            dayMap[day].push({ place, i });
          });
          const dayNumbers = Object.keys(dayMap).map(Number).sort((a, b) => a - b);
          const isMultiDay = dayNumbers.length > 1;

          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('itinerary.places')} ({itinerary.places.length})
              </Text>
              {isMultiDay ? dayNumbers.map(day => (
                <View key={day}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderDot} />
                    <Text style={styles.dayLabel}>{t('itinerary.dayHeader', { n: day })}</Text>
                    <View style={styles.dayLine} />
                  </View>
                  {dayMap[day].map(({ place, i }, position) => (
                    <TimelineStep
                      key={i}
                      place={place}
                      isLast={position === dayMap[day].length - 1}
                    />
                  ))}
                </View>
              )) : itinerary.places.map((place, i) => (
                <TimelineStep
                  key={i}
                  place={place}
                  isLast={i === itinerary.places.length - 1}
                />
              ))}
            </View>
          );
        })()}

        {/* Map — native only */}
        {Platform.OS !== 'web' && itinerary.places?.some(p => p.latitude && p.longitude) && (
          <ItineraryMap places={itinerary.places} location={itinerary.location} t={t} />
        )}

        {/* Comments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('comments.title')} ({comments.length})</Text>

          {isAuthenticated && (
            <View style={styles.commentForm}>
              <View style={styles.commentFormAvatar}>
                {me?.avatarUrl
                  ? <Image source={{ uri: me.avatarUrl }} style={styles.commentAvatarImg} />
                  : <Text style={styles.commentAvatarInitial}>{me?.username?.charAt(0).toUpperCase()}</Text>
                }
              </View>
              <View style={styles.commentFormRight}>
                <TextInput
                  style={styles.commentInput}
                  placeholder={t('comments.addComment')}
                  placeholderTextColor="#9ca3af"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                {commentText.trim() !== '' && (
                  <View style={styles.commentFormActions}>
                    <TouchableOpacity onPress={() => setCommentText('')}>
                      <Text style={styles.commentCancel}>{t('comments.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.commentPostBtn, submitting && styles.commentPostBtnDisabled]}
                      onPress={handleAddComment}
                      disabled={submitting}
                    >
                      <Text style={styles.commentPostBtnText}>{submitting ? t('comments.posting') : t('comments.post')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {!isAuthenticated && (
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginPrompt}>{t('comments.loginToLeave')}</Text>
            </TouchableOpacity>
          )}

          {comments.length === 0 && isAuthenticated && (
            <Text style={styles.noComments}>{t('comments.beFirst')}</Text>
          )}

          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentAvatar}>
                {comment.user?.avatarUrl
                  ? <Image source={{ uri: comment.user.avatarUrl }} style={styles.commentAvatarImg} />
                  : <Text style={styles.commentAvatarInitial}>{comment.user?.username?.charAt(0).toUpperCase()}</Text>
                }
              </View>
              <View style={styles.commentBody}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>@{comment.user?.username}</Text>
                  {comment.postedAgo && <Text style={styles.commentTime}>{comment.postedAgo}</Text>}
                  {me?.id === comment.user?.id && (
                    <TouchableOpacity onPress={() => handleDeleteComment(comment.id)} style={styles.commentDeleteBtn}>
                      <Text style={styles.commentDeleteText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

// ─── Timeline step ────────────────────────────────────────────────────────────
const TimelineStep = ({ place, isLast }) => {
  const cfg = getStepConfig(place.category);
  const dimColor = cfg.color + '25';
  return (
    <View style={tl.row}>
      <View style={tl.col}>
        <View style={[tl.dot, { backgroundColor: cfg.color }]}>
          <Ionicons name={cfg.icon} size={13} color="#fff" />
        </View>
        {!isLast && <View style={tl.connector} />}
      </View>
      <View style={[tl.content, isLast && tl.contentLast]}>
        <View style={[tl.badge, { backgroundColor: dimColor }]}>
          <Text style={[tl.badgeText, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
        </View>
        <Text style={tl.name}>{place.name}</Text>
        {place.description ? <Text style={tl.desc}>{place.description}</Text> : null}
        {place.address ? (
          <View style={tl.addressRow}>
            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
            <Text style={tl.address}>{place.address}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const tl = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  col: { width: 28, alignItems: 'center' },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  connector: { width: 2, flex: 1, minHeight: 12, backgroundColor: '#E5E7EB', marginVertical: 3 },
  content: { flex: 1, paddingBottom: 20, paddingTop: 1 },
  contentLast: { paddingBottom: 4 },
  badge: {
    alignSelf: 'flex-start', borderRadius: 6,
    paddingVertical: 2, paddingHorizontal: 7, marginBottom: 5,
  },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  name: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4, lineHeight: 20 },
  desc: { fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 2 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  address: { fontSize: 12, color: '#9CA3AF' },
});

// ─── Map component (native only) ─────────────────────────────────────────────
const ItineraryMap = ({ places, location, t }) => {
  const mapRef = useRef(null);
  const validPlaces = places.filter(p => p.latitude && p.longitude);

  const initialRegion = (() => {
    if (validPlaces.length === 0) return null;
    const lats = validPlaces.map(p => parseFloat(p.latitude));
    const lons = validPlaces.map(p => parseFloat(p.longitude));
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.02) * 1.4,
      longitudeDelta: Math.max(maxLon - minLon, 0.02) * 1.4,
    };
  })();

  if (!initialRegion || !MapView) return null;

  return (
    <View style={mapStyles.section}>
      <Text style={mapStyles.title}>{t('itinerary.tripArea')}</Text>
      <View style={mapStyles.container}>
        <MapView
          ref={mapRef}
          style={mapStyles.map}
          initialRegion={initialRegion}
          onMapReady={() => {
            if (validPlaces.length > 1) {
              mapRef.current?.fitToCoordinates(
                validPlaces.map(p => ({
                  latitude: parseFloat(p.latitude),
                  longitude: parseFloat(p.longitude),
                })),
                { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false }
              );
            }
          }}
        >
          {validPlaces.map((place, i) => (
            <Marker
              key={i}
              coordinate={{
                latitude: parseFloat(place.latitude),
                longitude: parseFloat(place.longitude),
              }}
              title={place.name}
            >
              <View style={mapStyles.marker}>
                <Text style={mapStyles.markerText}>{i + 1}</Text>
              </View>
            </Marker>
          ))}
        </MapView>
      </View>
    </View>
  );
};

const mapStyles = StyleSheet.create({
  section: { marginBottom: 28 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  container: { borderRadius: 14, overflow: 'hidden', ...shadow(2, 0.08, 8, 2) },
  map: { width: '100%', height: 240 },
  marker: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary, borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  markerText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, subvalue }) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
    {subvalue && <Text style={styles.statSubvalue}>{subvalue}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  errorText: { textAlign: 'center', marginTop: 60, color: '#6b7280', fontSize: 15 },

  // Hero
  heroContainer: { position: 'relative' },
  heroImage: { width: '100%', height: 420 },
  backBtn: {
    position: 'absolute', left: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22, width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontSize: 20, lineHeight: 22 },
  heroActions: {
    position: 'absolute', right: 16,
    flexDirection: 'row', gap: 8,
  },
  actionBtn: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22, width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnDanger: {
    backgroundColor: 'rgba(220,38,38,0.6)',
    borderColor: 'rgba(255,100,100,0.3)',
  },
  actionBtnSaved: {
    backgroundColor: 'rgba(0,119,182,0.75)',
    borderColor: 'rgba(100,200,255,0.3)',
  },
  actionIcon: { fontSize: 17 },
  heroContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(26,83,92,0.85)',
    borderWidth: 1, borderColor: 'rgba(168,213,199,0.3)',
    borderRadius: 14,
    paddingVertical: 4, paddingHorizontal: 12, marginBottom: 10,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroTitle: {
    fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 12,
    lineHeight: 32,
    ...textShadow(1, 0.4, 4),
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.accent,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  authorAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  authorAvatarInitial: { color: '#fff', fontSize: 13, fontWeight: '700' },
  authorName: {
    color: 'rgba(255,255,255,0.95)', fontSize: 14, fontWeight: '500',
    ...textShadow(1, 0.3, 2),
  },
  heroDate: {
    color: 'rgba(255,255,255,0.8)', fontSize: 13,
    ...textShadow(1, 0.3, 2),
  },

  // Body
  body: { padding: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  description: { fontSize: 14, color: '#374151', lineHeight: 22 },

  // Stats
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 14, color: '#111827', fontWeight: '600', marginTop: 2 },
  statSubvalue: { fontSize: 12, color: '#6b7280', marginTop: 1 },

  // Day groups
  dayHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 20, marginBottom: 8,
  },
  dayHeaderDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary,
  },
  dayLabel: {
    fontSize: 11, fontWeight: '800', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  dayLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },

  // Comments
  loginPrompt: {
    color: COLORS.primary, fontSize: 14, marginBottom: 12,
    textDecorationLine: 'underline',
  },
  noComments: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  commentForm: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  commentFormAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden',
  },
  commentFormRight: { flex: 1 },
  commentInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: '#111827', minHeight: 40, maxHeight: 120,
  },
  commentFormActions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    gap: 8, marginTop: 6,
  },
  commentCancel: { fontSize: 13, color: '#6b7280', paddingVertical: 6, paddingHorizontal: 10 },
  commentPostBtn: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  commentPostBtnDisabled: { opacity: 0.5 },
  commentPostBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  commentCard: {
    flexDirection: 'row', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden',
  },
  commentAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  commentAvatarInitial: { color: '#fff', fontSize: 13, fontWeight: '700' },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: '#111827' },
  commentTime: { fontSize: 12, color: '#9ca3af', flex: 1 },
  commentDeleteBtn: { padding: 4 },
  commentDeleteText: { color: '#9ca3af', fontSize: 12 },
  commentContent: { fontSize: 14, color: '#374151', lineHeight: 20 },
});

export default ItineraryScreen;
