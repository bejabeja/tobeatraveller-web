import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { checkIsLiked, formatBudgetAmount, toggleLike, selectIsAuthenticated, ANALYTICS_EVENTS } from '@tobeatraveller/shared';
import { cardInnerActions } from '../utils/accessibility';
import { trackEvent } from '../utils/analytics';
import TripPhoto from './TripPhoto';
import { COLORS, shadow } from '../utils/styles';

const ItineraryCard = ({ itinerary, onPress, onRequestLogin, compact = false }) => {
  const { t, i18n } = useTranslation();
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
      if (data.isLiked) trackEvent(ANALYTICS_EVENTS.TRIP_LIKED);
      setIsLiked(data.isLiked);
      setLikesCount(data.likesCount);
    } catch {
      setIsLiked(prev);
      setLikesCount(c => prev ? c + 1 : c - 1);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      {...cardInnerActions([{ name: 'like', label: t('itinerary.like'), onPress: handleLike }])}
    >
      <TripPhoto uri={itinerary.photoUrl} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.78)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Visibility badge: top left */}
      {itinerary.isPublic === false && (
        <View style={[styles.visibilityBadge, compact && styles.badgeCompact]}>
          <Ionicons name="lock-closed" size={compact ? 9 : 10} color="#fff" />
          {!compact && <Text style={styles.visibilityText}>{t('myItineraries.private')}</Text>}
        </View>
      )}

      {/* Like button: top right */}
      <TouchableOpacity
        style={[styles.likeBtn, compact && styles.badgeCompact]}
        onPress={handleLike}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={compact ? 12 : 15}
          color={isLiked ? COLORS.primary : '#fff'}
        />
        <Text style={[styles.likeCount, compact && styles.likeCountCompact, isLiked && styles.likeCountActive]}>
          {likesCount}
        </Text>
      </TouchableOpacity>

      {/* Content overlay: bottom */}
      <View style={[styles.overlay, compact && styles.overlayCompact]}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={compact ? 1 : 2}>
          {itinerary.title}
        </Text>
        {!!itinerary.location?.name && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={compact ? 10 : 11} color="rgba(255,255,255,0.85)" />
            <Text
              style={[styles.locationText, compact && styles.locationTextCompact]}
              numberOfLines={1}
            >
              {itinerary.location.name}
            </Text>
          </View>
        )}
        {!compact && (
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
                <Text style={styles.metaText}>{formatBudgetAmount(parseFloat(itinerary.budget), itinerary.currency, i18n.language)}</Text>
              </View>
            )}
            {(itinerary.commentsCount ?? 0) > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="chatbubble-outline" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={styles.metaText}>{itinerary.commentsCount}</Text>
              </View>
            )}
          </View>
        )}
        {compact && itinerary.tripTotalDays > 0 && (
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={9} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaTextCompact}>{itinerary.tripTotalDays}d</Text>
            </View>
          </View>
        )}
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
  cardCompact: { height: 130, borderRadius: 12 },
  likeBtn: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8,
  },
  visibilityBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8,
  },
  badgeCompact: { top: 6, paddingVertical: 3, paddingHorizontal: 6 },
  visibilityText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  likeCount: { fontSize: 11, color: '#fff', fontWeight: '600' },
  likeCountCompact: { fontSize: 10 },
  likeCountActive: { color: COLORS.primary },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 11, gap: 3,
  },
  overlayCompact: { padding: 8, gap: 1 },
  title: {
    fontSize: 14, fontWeight: '700', color: '#fff', lineHeight: 19,
  },
  titleCompact: { fontSize: 12, lineHeight: 15 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', flex: 1 },
  locationTextCompact: { fontSize: 10 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 1, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 10, color: 'rgba(255,255,255,0.72)' },
  metaTextCompact: { fontSize: 9, color: 'rgba(255,255,255,0.72)' },
});

export default ItineraryCard;
