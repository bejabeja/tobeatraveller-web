import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getItineraryById } from '@tobeatraveller/shared';

const ItineraryScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItineraryById(id)
      .then(setItinerary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator size="large" color="#0077b6" style={styles.loader} />;
  if (!itinerary) return <Text style={styles.error}>Itinerary not found.</Text>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Image source={{ uri: itinerary.photoUrl }} style={styles.hero} />
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      <View style={styles.body}>
        <Text style={styles.title}>{itinerary.title}</Text>
        {itinerary.location?.name && <Text style={styles.location}>📍 {itinerary.location.name}</Text>}
        {itinerary.description && <Text style={styles.description}>{itinerary.description}</Text>}

        <View style={styles.stats}>
          <Stat icon="🗓" value={`${itinerary.tripTotalDays} days`} />
          <Stat icon="💰" value={`${itinerary.budget} ${itinerary.currency}`} />
          <Stat icon="👥" value={`${itinerary.numberOfPeople} travellers`} />
        </View>

        {itinerary.places?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Places ({itinerary.places.length})</Text>
            {itinerary.places.map((place, i) => (
              <View key={i} style={styles.placeCard}>
                <View style={styles.placeNumber}><Text style={styles.placeNumberText}>{i + 1}</Text></View>
                <View style={styles.placeInfo}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  {place.description && <Text style={styles.placeDesc} numberOfLines={2}>{place.description}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const Stat = ({ icon, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, marginTop: 40 },
  error: { textAlign: 'center', marginTop: 40, color: '#6b7280' },
  hero: { width: '100%', height: 260 },
  backBtn: { position: 'absolute', top: 52, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#fff', fontSize: 18, lineHeight: 20 },
  body: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  location: { fontSize: 14, color: '#6b7280', marginTop: 6 },
  description: { fontSize: 14, color: '#374151', marginTop: 12, lineHeight: 22 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3f4f6', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  statIcon: { fontSize: 14 },
  statValue: { fontSize: 13, color: '#374151', fontWeight: '500' },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  placeCard: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  placeNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0077b6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  placeNumberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  placeInfo: { flex: 1 },
  placeName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  placeDesc: { fontSize: 13, color: '#6b7280', marginTop: 2, lineHeight: 18 },
});

export default ItineraryScreen;
