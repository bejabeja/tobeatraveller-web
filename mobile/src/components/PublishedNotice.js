import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

// Right after creating a trip, the best moment to show it: whoever just made
// it is the one most likely to send it to someone.
const PublishedNotice = ({ isPublic, onShare, onEdit, onDismiss }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Text style={styles.title} accessibilityRole="header">
        {t(isPublic ? 'itinerary.publishedTitle' : 'itinerary.createdPrivateTitle')}
      </Text>
      <Text style={styles.text}>{t(isPublic ? 'itinerary.publishedText' : 'itinerary.createdPrivateText')}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primary} onPress={isPublic ? onShare : onEdit} accessibilityRole="button">
          <Text style={styles.primaryText}>{t(isPublic ? 'itinerary.publishedShare' : 'itinerary.createdPrivateEdit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onDismiss} accessibilityRole="button">
          <Text style={styles.secondaryText}>{t('itinerary.publishedDismiss')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16, padding: 16, gap: 6,
    backgroundColor: '#fff', borderRadius: 14, borderLeftWidth: 4, borderLeftColor: '#E8743B',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  text: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  primary: { backgroundColor: '#E8743B', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondary: { paddingVertical: 10, paddingHorizontal: 8 },
  secondaryText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
});

export default PublishedNotice;
