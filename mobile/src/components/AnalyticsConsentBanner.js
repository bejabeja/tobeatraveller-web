import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAnalyticsConsent } from '../hooks/useAnalyticsConsent';

// Asked once, like the web's cookie banner: nothing is measured until the
// person says yes, and they can change it later in Settings.
const AnalyticsConsentBanner = ({ onLearnMore }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { consent, answer } = useAnalyticsConsent();

  if (consent !== null) return null;

  return (
    <View style={[styles.banner, { paddingBottom: insets.bottom + 16 }]} accessibilityRole="alert">
      <Text style={styles.text}>
        {t('analyticsConsent.description')}{' '}
        <Text style={styles.link} onPress={onLearnMore} accessibilityRole="link">{t('cookieConsent.learnMore')}</Text>
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.decline} onPress={() => answer(false)} accessibilityRole="button">
          <Text style={styles.declineText}>{t('cookieConsent.decline')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.accept} onPress={() => answer(true)} accessibilityRole="button">
          <Text style={styles.acceptText}>{t('cookieConsent.accept')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingTop: 16, paddingHorizontal: 16, backgroundColor: '#1b2a41',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  text: { fontSize: 13, lineHeight: 19, color: '#fff' },
  link: { color: '#d9a441', fontWeight: '600', textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  decline: {
    flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  declineText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  accept: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', backgroundColor: '#E8743B' },
  acceptText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default AnalyticsConsentBanner;
