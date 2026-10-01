import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '@tobeatraveller/shared';
import { useVanToday } from '../hooks/useVanToday';
import { shadow } from '../utils/styles';

// The four tools of the road, within reach of the first screen.
const TOOLS = [
  { screen: 'VanLog', icon: 'book-outline', labelKey: 'nav.vanLog' },
  { screen: 'Supplies', icon: 'cart-outline', labelKey: 'nav.supplies' },
  { screen: 'PackingChecklist', icon: 'briefcase-outline', labelKey: 'nav.packingChecklist' },
  { screen: 'LifeDiary', icon: 'journal-outline', labelKey: 'nav.lifeDiary' },
];

const LOADING_TEXT = '…';

const VanToday = ({ navigation, userId }) => {
  const { t, i18n } = useTranslation();
  const { loading, summary } = useVanToday(userId);
  const { monthTotals, shoppingCount } = summary;

  const monthText = loading && monthTotals === null
    ? LOADING_TEXT
    : monthTotals === null
    ? t('vanToday.unavailable')
    : monthTotals.length === 0
    ? t('vanToday.monthNothing')
    : monthTotals.map(({ currency, total }) => formatAmount(total, currency, i18n.resolvedLanguage)).join(' · ');

  const shoppingText = loading && shoppingCount === null
    ? LOADING_TEXT
    : shoppingCount === null
    ? t('vanToday.unavailable')
    : shoppingCount === 0
    ? t('vanToday.shoppingNothing')
    : t('vanToday.shoppingCount', { count: shoppingCount });

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{t('vanToday.title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('VanLogEntryForm')} accessibilityRole="button">
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>{t('vanToday.addExpense')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('VanLog')} accessibilityRole="button">
          <Text style={styles.cardLabel}>{t('vanToday.monthTitle')}</Text>
          <Text style={styles.cardValue}>{monthText}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Supplies')} accessibilityRole="button">
          <Text style={styles.cardLabel}>{t('vanToday.shoppingTitle')}</Text>
          <Text style={styles.cardValue}>{shoppingText}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tools}>
        {TOOLS.map(({ screen, icon, labelKey }) => (
          <TouchableOpacity key={screen} style={styles.tool} onPress={() => navigation.navigate(screen)} accessibilityRole="button">
            <Ionicons name={icon} size={22} color="#E8743B" />
            <Text style={styles.toolText} numberOfLines={1}>{t(labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    margin: 16, marginBottom: 0, padding: 16, gap: 14,
    backgroundColor: '#fff', borderRadius: 16,
    ...shadow(2, 0.06, 8, 2),
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8743B', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cards: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, gap: 4 },
  cardLabel: { fontSize: 12, color: '#6b7280' },
  cardValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  tools: { flexDirection: 'row', gap: 8 },
  tool: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 2,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
  },
  toolText: { fontSize: 11, fontWeight: '600', color: '#374151' },
});

export default VanToday;
