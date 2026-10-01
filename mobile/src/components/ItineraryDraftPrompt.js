import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@tobeatraveller/shared';
import { shadow } from '../utils/styles';

// Shown instead of a form that would start empty over a trip left unfinished:
// the person decides before anything is saved.
export const ItineraryDraftPrompt = ({ draft, onContinue, onDiscard }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const name = draft.values.title || draft.values.destination?.name || '';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.card}>
        <Text style={styles.emoji}>📝</Text>
        <Text style={styles.title}>{t('createItinerary.draftTitle')}</Text>
        <Text style={styles.desc}>
          {t('createItinerary.draftDesc', { title: name, date: formatDate(draft.savedAt, i18n.resolvedLanguage, { dateStyle: 'medium' }) })}
        </Text>
        <Text style={styles.note}>{t('createItinerary.draftNote')}</Text>
        <TouchableOpacity style={styles.primary} onPress={onContinue} accessibilityRole="button">
          <Text style={styles.primaryText}>{t('createItinerary.draftContinue')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onDiscard} accessibilityRole="button">
          <Text style={styles.secondaryText}>{t('createItinerary.draftDiscard')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center',
    ...shadow(2, 0.06, 8, 2),
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 15, color: '#374151', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  note: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  primary: { backgroundColor: '#E8743B', borderRadius: 999, paddingVertical: 14, alignSelf: 'stretch', alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { paddingVertical: 14, alignSelf: 'stretch', alignItems: 'center' },
  secondaryText: { color: '#374151', fontWeight: '600', fontSize: 15 },
});
