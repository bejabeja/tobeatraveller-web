import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { initExploreItineraries, selectExploreItineraries, selectExploreItinerariesLoading } from '@tobeatraveller/shared';
import ItineraryCard from '../../components/ItineraryCard';

const ExploreScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const itineraries = useSelector(selectExploreItineraries);
  const loading = useSelector(selectExploreItinerariesLoading);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(initExploreItineraries({ page: 1, destination: search, sortBy: 'recent' }));
  }, [dispatch, search]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by destination…"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {loading && itineraries.length === 0 ? (
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
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  searchInput: { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827' },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 12 },
});

export default ExploreScreen;
