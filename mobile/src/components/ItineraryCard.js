import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { shadow } from '../utils/styles';

const ItineraryCard = ({ itinerary, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    <Image
      source={{ uri: itinerary.photoUrl || 'https://placehold.co/400x200/e5e7eb/9ca3af?text=No+image' }}
      style={styles.image}
    />
    <View style={styles.body}>
      <Text style={styles.title} numberOfLines={1}>{itinerary.title}</Text>
      {itinerary.location?.name && (
        <Text style={styles.location}>📍 {itinerary.location.name}</Text>
      )}
      <View style={styles.meta}>
        {itinerary.tripTotalDays && (
          <Text style={styles.metaItem}>🗓 {itinerary.tripTotalDays}d</Text>
        )}
        {parseFloat(itinerary.budget) > 0 && (
          <Text style={styles.metaItem}>💰 {itinerary.budget} {itinerary.currency}</Text>
        )}
        <Text style={styles.metaItem}>❤️ {itinerary.likesCount ?? 0}</Text>
        <Text style={styles.metaItem}>💬 {itinerary.commentsCount ?? 0}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', ...shadow(2, 0.06, 8, 2) },
  image: { width: '100%', height: 160 },
  body: { padding: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  location: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  meta: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  metaItem: { fontSize: 12, color: '#6b7280' },
});

export default ItineraryCard;
