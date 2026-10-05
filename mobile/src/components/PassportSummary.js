import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { summarizePassport } from '@tobeatraveller/shared';
import { useUserPassport } from '../hooks/useUserPassport';
import { shadow } from '../utils/styles';

const NO_FLAGS = 0;

// Where their passport stands, for someone who does not live in a van (they
// have their own panel). Not for someone with nothing in it yet: "no countries"
// is no news, and the Home is for what is there.
const PassportSummary = ({ navigation, userId }) => {
  const { t } = useTranslation();
  const { passport } = useUserPassport(userId);
  const summary = summarizePassport(passport, NO_FLAGS);

  if (!summary || (summary.countryCount === 0 && summary.earnedCount === 0)) return null;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Passport', { userId })} accessibilityRole="button">
        <Text style={styles.label}>🛂 {t('passport.title')}</Text>
        <Text style={styles.value}>{t('passport.countriesCount', { count: summary.countryCount })}</Text>
        <Text style={styles.hint}>{t('passport.collected', { earned: summary.earnedCount, total: summary.totalCount })}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { margin: 16, marginBottom: 0 },
  card: {
    padding: 14, gap: 4, backgroundColor: '#fff', borderRadius: 14,
    ...shadow(2, 0.06, 8, 2),
  },
  label: { fontSize: 12, color: '#6b7280' },
  value: { fontSize: 16, fontWeight: '700', color: '#111827' },
  hint: { fontSize: 12, color: '#6b7280' },
});

export default PassportSummary;
