import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { shadow } from '../utils/styles';

const TOOLS = [
  { screen: 'VanLog', icon: 'book-outline', labelKey: 'nav.vanLog' },
  { screen: 'Supplies', icon: 'cart-outline', labelKey: 'nav.supplies' },
  { screen: 'PackingChecklist', icon: 'briefcase-outline', labelKey: 'nav.packingChecklist' },
  { screen: 'LifeDiary', icon: 'journal-outline', labelKey: 'nav.lifeDiary' },
];

const ACCOUNT_ITEMS = [
  { screen: 'Subscription', icon: 'sparkles-outline', labelKey: 'nav.subscription' },
  { screen: 'Referral', icon: 'gift-outline', labelKey: 'referral.accountCardTitle' },
  { screen: 'Settings', icon: 'settings-outline', labelKey: 'nav.settings' },
];

// Everything that is not a tab, reachable from the first two screens: the tools,
// the plan and the settings, instead of living inside the profile.
const AccountMenuButton = ({ navigation, color = '#374151', style }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const go = (screen) => {
    setOpen(false);
    navigation.navigate(screen);
  };

  const renderItem = ({ screen, icon, labelKey }) => (
    <TouchableOpacity key={screen} style={styles.item} onPress={() => go(screen)} accessibilityRole="button">
      <Ionicons name={icon} size={22} color="#E8743B" />
      <Text style={styles.itemText}>{t(labelKey)}</Text>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('nav.menu')}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="menu" size={26} color={color} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">{t('nav.menu')}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.section}>{t('home.yourTools')}</Text>
            {TOOLS.map(renderItem)}
            <View style={styles.divider} />
            {ACCOUNT_ITEMS.map(renderItem)}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: { padding: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 16,
    ...shadow(8, 0.15, 16, 0),
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  section: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  itemText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 6 },
});

export default AccountMenuButton;
