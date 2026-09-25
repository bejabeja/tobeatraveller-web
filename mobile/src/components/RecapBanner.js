import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { recapYear } from '@tobeatraveller/shared';

// The way into the yearly recap, only while it's in season (December and January).
const RecapBanner = ({ onPress }) => {
  const { t } = useTranslation();
  const year = recapYear();
  if (year === null) return null;

  return (
    <TouchableOpacity style={styles.banner} onPress={onPress} accessibilityRole="button">
      <Text style={styles.title}>{t('recap.bannerTitle', { year })}</Text>
      <Text style={styles.cta}>{t('recap.bannerCta')} →</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: '#1b2a41', gap: 4,
  },
  title: { fontSize: 15, fontWeight: '800', color: '#fff' },
  cta: { fontSize: 13, fontWeight: '700', color: '#d9a441' },
});

export default RecapBanner;
