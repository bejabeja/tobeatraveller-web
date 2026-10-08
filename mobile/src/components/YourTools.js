import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { shadow } from '../utils/styles';
import ToolShortcuts from './ToolShortcuts';

// For whoever does not live in a van: the same tools, under their own name,
// since expenses, a packing list and a diary are for any trip.
const YourTools = ({ navigation }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">{t('home.yourTools')}</Text>
      <ToolShortcuts navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    margin: 16, marginBottom: 0, padding: 16, gap: 14,
    backgroundColor: '#fff', borderRadius: 16,
    ...shadow(2, 0.06, 8, 2),
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
});

export default YourTools;
