import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  findNextTrip, getPackingLists, listsForTrip, localCalendarDay, selectAuthUser, selectMyItineraries, selectMyItinerariesLoaded,
} from '@tobeatraveller/shared';
import { useUnfinishedDraft } from '../hooks/useUnfinishedDraft';

const NextTripCard = ({ navigation }) => {
  const { t } = useTranslation();
  const itineraries = useSelector(selectMyItineraries);
  const loaded = useSelector(selectMyItinerariesLoaded);
  const draft = useUnfinishedDraft(useSelector(selectAuthUser)?.id);
  const next = loaded ? findNextTrip(itineraries, localCalendarDay()) : null;
  const nextTripId = next?.itinerary.id;
  // Undefined until its lists are known: offering to start one before (or
  // when they can't be loaded) could make a second list for the same trip.
  const [tripList, setTripList] = useState(undefined);

  // Its packing list, to show how far along it is (or offer to start one).
  // Home stays mounted behind the other screens, so it's fetched again each
  // time it comes back into view: a list just made or ticked shows up.
  useEffect(() => setTripList(undefined), [nextTripId]);
  useFocusEffect(
    useCallback(() => {
      if (!nextTripId) return;
      getPackingLists()
        .then(({ lists }) => setTripList(listsForTrip(lists, nextTripId)[0] ?? null))
        .catch(() => {});
    }, [nextTripId])
  );

  if (!loaded) return null;

  const planTrip = () => navigation.navigate('CreateItinerary');

  // What they left half done comes first when they have no trip coming: it is the next
  // thing they were doing. With one coming it is a link under it, not a second card.
  if (!next && draft) {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate(draft.screen)} accessibilityRole="button" activeOpacity={0.8}>
          <Text style={styles.label}>{t('home.draftLabel')}</Text>
          <Text style={styles.title} numberOfLines={1}>{draft.name || t('home.draftUnnamed')}</Text>
          <Text style={styles.when} numberOfLines={1}>{t('home.draftContinue')} →</Text>
        </TouchableOpacity>
        <View style={styles.links}>
          <TouchableOpacity onPress={planTrip} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.planLink}>{t('home.planTrip')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
      <View style={styles.links}>
        {tripList === undefined ? null : tripList ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('PackingList', { listId: tripList.id, name: tripList.name, itinerary: tripList.itinerary })}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.planLink}>🎒 {t('home.tripListProgress', { name: tripList.name, checked: tripList.checkedCount, total: tripList.itemCount })}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('PackingChecklist', { forTripId: itinerary.id })}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.planLink}>🎒 {t('home.prepareTrip')}</Text>
          </TouchableOpacity>
        )}
        {draft && (
          <TouchableOpacity onPress={() => navigation.navigate(draft.screen)} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.planLink}>✏️ {t('home.draftLabel')}: {draft.name || t('home.draftUnnamed')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={planTrip} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.planLink}>{t('home.planTrip')}</Text>
        </TouchableOpacity>
      </View>
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
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  planLink: { fontSize: 13, fontWeight: '600', color: '#fff', textDecorationLine: 'underline' },

  none: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 16 },
  noneText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.92)' },
  planBtn: { backgroundColor: '#E8743B', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  planBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

export default NextTripCard;
