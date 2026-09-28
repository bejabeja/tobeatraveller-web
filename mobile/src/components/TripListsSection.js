import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPackingLists, listsForTrip } from '@tobeatraveller/shared';
import { COLORS } from '../utils/styles';

// The owner's packing lists for this trip, and a way to start one for it.
// Nobody else sees them: they're private.
const TripListsSection = ({ itineraryId, navigation }) => {
  const { t } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const [lists, setLists] = useState(null);

  // Asked again on coming back, since a list may have been made for it meanwhile.
  useFocusEffect(useCallback(() => {
    getPackingLists()
      .then(({ lists: all }) => setLists(listsForTrip(all, itineraryId)))
      .catch(() => setLists(current => current ?? []));
  }, [itineraryId]));

  if (lists === null) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">{p('tripLists')}</Text>
      {lists.map((list) => (
        <TouchableOpacity
          key={list.id}
          style={styles.item}
          onPress={() => navigation.navigate('PackingList', { listId: list.id, name: list.name, itinerary: list.itinerary })}
          accessibilityRole="button"
        >
          <Text style={styles.emoji}>🎒</Text>
          <View style={styles.itemText}>
            <Text style={styles.itemName}>{list.name}</Text>
            <Text style={styles.itemMeta}>
              {list.itemCount === 0 ? p('listEmpty') : p('listProgress', { checked: list.checkedCount, total: list.itemCount })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={styles.newBtn}
        onPress={() => navigation.navigate('PackingChecklist', { forTripId: itineraryId })}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={16} color={COLORS.primary} />
        <Text style={styles.newBtnText}>{p('newListForTrip')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 28, gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  emoji: { fontSize: 20 },
  itemText: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  itemMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  newBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});

export default TripListsSection;
