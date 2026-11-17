import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

// Shown instead of a feature's normal empty state when the list failed to
// load, so a 403 (premium required) doesn't look like "you have no entries".
const FeatureLoadState = ({ status, onRetry }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  if (status === 'premium') {
    return (
      <View style={styles.container}>
        <Ionicons name="lock-closed-outline" size={40} color="#B5501B" />
        <Text style={styles.title}>{t('premium.requiredTitle')}</Text>
        <Text style={styles.desc}>{t('premium.requiredDesc')}</Text>
        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('Subscription')}>
          <Text style={styles.ctaText}>{t('premium.requiredCta')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={40} color="#9ca3af" />
      <Text style={styles.title}>{t('premium.loadErrorDesc')}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry}>
          <Text style={styles.retry}>{t('common.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32 },
  title: { fontSize: 15, color: '#374151', fontWeight: '600', textAlign: 'center', marginTop: 12 },
  desc: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 4 },
  retry: { fontSize: 14, color: '#B5501B', fontWeight: '600', marginTop: 10 },
  cta: {
    backgroundColor: '#B5501B', borderRadius: 999,
    paddingVertical: 12, paddingHorizontal: 24, marginTop: 16,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default FeatureLoadState;
