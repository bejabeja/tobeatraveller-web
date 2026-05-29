import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { checkIsLiked, toggleLike, selectIsAuthenticated } from '@tobeatraveller/shared';
import { shadow } from '../utils/styles';

const ItineraryCard = ({ itinerary, onPress, onRequestLogin }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [isLiked, setIsLiked]       = useState(false);
  const [likesCount, setLikesCount] = useState(itinerary.likesCount ?? 0);

  // Fetch like status once on mount (authenticated only)
  useEffect(() => {
    if (!isAuthenticated || !itinerary?.id) return;
    checkIsLiked(itinerary.id)
      .then(data => { setIsLiked(data.isLiked); setLikesCount(data.likesCount); })
      .catch(() => {});
  }, [itinerary?.id, isAuthenticated]);

  const handleLike = async () => {
    if (!isAuthenticated) { onRequestLogin?.(); return; }
    const prev = isLiked;
    // Optimistic update
    setIsLiked(!prev);
    setLikesCount(c => prev ? c - 1 : c + 1);
    try {
      const data = await toggleLike(itinerary.id);
      setIsLiked(data.isLiked);
      setLikesCount(data.likesCount);
    } catch {
      // Revert on error
      setIsLiked(prev);
      setLikesCount(c => prev ? c + 1 : c - 1);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image
        source={{ uri: itinerary.photoUrl || 'https://placehold.co/400x200/e5e7eb/9ca3af?text=No+image' }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{itinerary.title}</Text>
        {itinerary.location?.name && (
          <Text style={styles.location}>📍 {itinerary.location.name}</Text>
        )}
        <View style={styles.footer}>
          <View style={styles.meta}>
            {itinerary.tripTotalDays > 0 && (
              <Text style={styles.metaItem}>🗓 {itinerary.tripTotalDays}d</Text>
            )}
            {parseFloat(itinerary.budget) > 0 && (
              <Text style={styles.metaItem}>💰 {itinerary.budget} {itinerary.currency}</Text>
            )}
            <Text style={styles.metaItem}>💬 {itinerary.commentsCount ?? 0}</Text>
          </View>

          {/* Like button — inner TouchableOpacity takes priority over the card press */}
          <TouchableOpacity
            style={styles.likeBtn}
            onPress={handleLike}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.likeHeart, isLiked && styles.likeHeartActive]}>
              {isLiked ? '❤️' : '🤍'}
            </Text>
            <Text style={[styles.likeCount, isLiked && styles.likeCountActive]}>
              {likesCount}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', ...shadow(2, 0.06, 8, 2) },
  image: { width: '100%', height: 160 },
  body: { padding: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  location: { fontSize: 13, color: '#6b7280', marginTop: 4 },

  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 8,
  },
  meta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1 },
  metaItem: { fontSize: 12, color: '#6b7280' },

  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  likeHeart: { fontSize: 14 },
  likeHeartActive: {},
  likeCount: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  likeCountActive: { color: '#ef4444' },
});

export default ItineraryCard;
