import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { findNextTrip, localCalendarDay, selectMyItineraries, selectMyItinerariesLoaded } from '@tobeatraveller/shared';

const NextTripCard = ({ navigation }) => {
  const { t } = useTranslation();
  const itineraries = useSelector(selectMyItineraries);
  const loaded = useSelector(selectMyItinerariesLoaded);
  if (!loaded) return null;

  const next = findNextTrip(itineraries, localCalendarDay());
  const planTrip = () => navigation.navigate('CreateItinerary');

  if (!next) {
    return (
      <View style={styles.none}>
        <Text style={styles.noneText}>{t('home.noNextTrip')}</Text>
        <TouchableOpacity style={styles.planBtn} onPress={planTrip} accessibilityRole="button">
          <Text style={styles.planBtnText}>{t('home.planTrip')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { itinerary } = next;
  const when = next.isOngoing
    ? t('home.onTripDay', { day: next.dayOfTrip, total: next.totalDays })
    : t('home.nextTripIn', { count: next.daysUntil });
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Itinerary', { id: itinerary.id })}
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <Text style={styles.label}>{next.isOngoing ? t('home.onTripLabel') : t('home.nextTripLabel')}</Text>
        <Text style={styles.title} numberOfLines={1}>{itinerary.title}</Text>
        <Text style={styles.when} numberOfLines={1}>{[when, itinerary.location?.name].filter(Boolean).join(' · ')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={planTrip} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.planLink}>{t('home.planTrip')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingBottom: 16 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' },
  title: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 },
  when: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  planLink: { fontSize: 13, fontWeight: '600', color: '#fff', textDecorationLine: 'underline' },

  none: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 16 },
  noneText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.92)' },
  planBtn: { backgroundColor: '#E8743B', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  planBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

export default NextTripCard;
