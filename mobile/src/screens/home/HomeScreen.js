import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { initFeaturedItineraries, selectFeaturedItineraries, selectFeaturedItinerariesLoading } from '@tobeatraveller/shared';
import ItineraryCard from '../../components/ItineraryCard';

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const itineraries = useSelector(selectFeaturedItineraries);
  const loading = useSelector(selectFeaturedItinerariesLoading);

  useEffect(() => {
    if (!itineraries || itineraries.length === 0) {
      dispatch(initFeaturedItineraries());
    }
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>To Be a Traveller</Text>
        <Text style={styles.subtitle}>Discover journeys around the world</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0077b6" style={styles.loader} />
      ) : (
        <FlatList
          data={itineraries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItineraryCard
              itinerary={item}
              onPress={() => navigation.navigate('Itinerary', { id: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 12 },
});

export default HomeScreen;
