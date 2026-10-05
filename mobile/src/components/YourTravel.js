import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { draftToResume, ITINERARY_DRAFT_KINDS, summarizePassport } from '@tobeatraveller/shared';
import { useUserPassport } from '../hooks/useUserPassport';
import { readItineraryDraft } from '../utils/itineraryDraftStorage';
import { shadow } from '../utils/styles';

const NO_FLAGS = 0;

const DRAFT_SCREENS = {
  [ITINERARY_DRAFT_KINDS.FORM]: 'CreateItinerary',
  [ITINERARY_DRAFT_KINDS.AI_PLAN]: 'PlanExperience',
};

// The Home of someone who does not live in a van: what they left half done,
// and where their passport stands. The counterpart of VanToday.
const YourTravel = ({ navigation, userId }) => {
  const { t } = useTranslation();
  const { passport } = useUserPassport(userId);
  const summary = summarizePassport(passport, NO_FLAGS);
  const [draft, setDraft] = useState(null);

  // On every focus: the draft changes in the form screens, which this one stays under.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        readItineraryDraft(userId, ITINERARY_DRAFT_KINDS.FORM),
        readItineraryDraft(userId, ITINERARY_DRAFT_KINDS.AI_PLAN),
      ]).then(([form, plan]) => { if (!cancelled) setDraft(draftToResume({ form, plan })); });
      return () => { cancelled = true; };
    }, [userId])
  );

  if (!draft && !summary) return null;

  return (
    <View style={styles.wrap}>
      {draft && (
        <TouchableOpacity
          style={[styles.card, styles.cardDraft]}
          onPress={() => navigation.navigate(DRAFT_SCREENS[draft.kind])}
          accessibilityRole="button"
        >
          <Text style={styles.label}>{t('home.draftLabel')}</Text>
          <Text style={styles.value} numberOfLines={2}>{draft.name || t('home.draftUnnamed')}</Text>
          <Text style={styles.hint}>{t('home.draftContinue')} →</Text>
        </TouchableOpacity>
      )}
      {summary && (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Passport', { userId })} accessibilityRole="button">
          <Text style={styles.label}>🛂 {t('passport.title')}</Text>
          <Text style={styles.value}>
            {summary.countryCount > 0 ? t('passport.countriesCount', { count: summary.countryCount }) : t('passport.noCountriesYet')}
          </Text>
          <Text style={styles.hint}>{t('passport.collected', { earned: summary.earnedCount, total: summary.totalCount })}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { margin: 16, marginBottom: 0, gap: 10 },
  card: {
    padding: 14, gap: 4, backgroundColor: '#fff', borderRadius: 14,
    ...shadow(2, 0.06, 8, 2),
  },
  cardDraft: { borderLeftWidth: 4, borderLeftColor: '#E8743B' },
  label: { fontSize: 12, color: '#6b7280' },
  value: { fontSize: 16, fontWeight: '700', color: '#111827' },
  hint: { fontSize: 12, color: '#6b7280' },
});

export default YourTravel;
