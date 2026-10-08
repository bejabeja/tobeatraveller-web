import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

// The four tools every traveller has, within reach of the first screen.
const TOOLS = [
  { screen: 'VanLog', icon: 'book-outline', labelKey: 'nav.vanLog' },
  { screen: 'Supplies', icon: 'cart-outline', labelKey: 'nav.supplies' },
  { screen: 'PackingChecklist', icon: 'briefcase-outline', labelKey: 'nav.packingChecklist' },
  { screen: 'LifeDiary', icon: 'journal-outline', labelKey: 'nav.lifeDiary' },
];

const ToolShortcuts = ({ navigation }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.tools}>
      {TOOLS.map(({ screen, icon, labelKey }) => (
        <TouchableOpacity key={screen} style={styles.tool} onPress={() => navigation.navigate(screen)} accessibilityRole="button">
          <Ionicons name={icon} size={22} color="#E8743B" />
          <Text style={styles.toolText} numberOfLines={2}>{t(labelKey)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tools: { flexDirection: 'row', gap: 8 },
  tool: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 2,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
  },
  // Two lines: "Listas de viaje" and "Lebenstagebuch" do not fit on one at this width.
  toolText: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center', minHeight: 28 },
});

export default ToolShortcuts;
