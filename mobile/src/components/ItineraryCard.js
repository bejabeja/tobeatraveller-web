import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { checkIsLiked, toggleLike, selectIsAuthenticated } from '@tobeatraveller/shared';
import { COLORS, shadow } from '../utils/styles';

const ItineraryCard = ({ itinerary, onPress, onRequestLogin }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [isLiked, setIsLiked]       = useState(false);
  const [likesCount, setLikesCount] = useState(itinerary.likesCount ?? 0);

  useEffect(() => {
    if (!isAuthenticated || !itinerary?.id) return;
    checkIsLiked(itinerary.id)
      .then(data => { setIsLiked(data.isLiked); setLikesCount(data.likesCount); })
      .catch(() => {});
  }, [itinerary?.id, isAuthenticated]);

  const handleLike = async () => {
    if (!isAuthenticated) { onRequestLogin?.(); return; }
    const prev = isLiked;
    setIsLiked(!prev);
    setLikesCount(c => prev ? c - 1 : c + 1);
    try {
      const data = await toggleLike(itinerary.id);
      setIsLiked(data.isLiked);
      setLikesCount(data.likesCount);
    } catch {
      setIsLiked(prev);
      setLikesCount(c => prev ? c + 1 : c - 1);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <Image
        source={{ uri: itinerary.photoUrl || 'https://placehold.co/400x200/1A535C/fff?text=✈' }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.78)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Like button — top right */}
      <TouchableOpacity
        style={styles.likeBtn}
        onPress={handleLike}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={15}
          color={isLiked ? COLORS.primary : '#fff'}
        />
        <Text style={[styles.likeCount, isLiked && styles.likeCountActive]}>
          {likesCount}
        </Text>
      </TouchableOpacity>

      {/* Content overlay — bottom */}
      <View style={styles.overlay}>
        <Text style={styles.title} numberOfLines={2}>{itinerary.title}</Text>
        {itinerary.location?.name && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={styles.locationText} numberOfLines={1}>{itinerary.location.name}</Text>
          </View>
        )}
        <View style={styles.metaRow}>
          {itinerary.tripTotalDays > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={10} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaText}>{itinerary.tripTotalDays}d</Text>
            </View>
          )}
          {parseFloat(itinerary.budget) > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={10} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaText}>{itinerary.budget} {itinerary.currency}</Text>
            </View>
          )}
          {(itinerary.commentsCount ?? 0) > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="chatbubble-outline" size={10} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaText}>{itinerary.commentsCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 200, borderRadius: 14, overflow: 'hidden',
    backgroundColor: COLORS.accent,
    ...shadow(4, 0.18, 10, 4),
  },
  likeBtn: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8,
  },
  likeCount: { fontSize: 11, color: '#fff', fontWeight: '600' },
  likeCountActive: { color: COLORS.primary },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 11, gap: 3,
  },
  title: {
    fontSize: 14, fontWeight: '700', color: '#fff', lineHeight: 19,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', flex: 1 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 1, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 10, color: 'rgba(255,255,255,0.72)' },
});

export default ItineraryCard;
