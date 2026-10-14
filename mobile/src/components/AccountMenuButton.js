import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { APP_LANGUAGES, toAppLanguage } from '@tobeatraveller/shared';
import i18n, { changeLanguage } from '../i18n';
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

const GUEST_SIGN_IN_ITEMS = [
  { screen: 'Login', icon: 'log-in-outline', labelKey: 'nav.login' },
  { screen: 'Register', icon: 'person-add-outline', labelKey: 'nav.createAccountBtn' },
];

const GUEST_INFO_ITEMS = [
  { screen: 'Terms', icon: 'document-text-outline', labelKey: 'legalTerms.documentTitle' },
  { screen: 'PrivacyPolicy', icon: 'shield-checkmark-outline', labelKey: 'legalPrivacy.documentTitle' },
  { screen: 'Contact', icon: 'help-circle-outline', labelKey: 'settings.contactUs' },
];

// Everything that is not a tab, reachable from the first two screens: the tools,
// the plan and the settings, instead of living inside the profile.
// Without a session only what needs no account is offered: signing in, the language and the legal pages.
const AccountMenuButton = ({ navigation, color = '#374151', style, isGuest = false }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const currentLanguageCode = toAppLanguage(i18n.language);
  const currentLanguage = APP_LANGUAGES.find(({ code }) => code === currentLanguageCode);

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
            {isGuest ? (
              <>
                <Text style={styles.guestValue}>{t('guestPrompt.menuValue')}</Text>
                {GUEST_SIGN_IN_ITEMS.map(renderItem)}
                <View style={styles.divider} />
                <TouchableOpacity style={styles.item} onPress={() => setLanguagesOpen(openNow => !openNow)} accessibilityRole="button" accessibilityState={{ expanded: languagesOpen }}>
                  <Ionicons name="language-outline" size={22} color="#E8743B" />
                  <Text style={styles.itemText}>{t('settings.language')}</Text>
                  <Text style={styles.itemValue}>{currentLanguage?.flag} {currentLanguage?.name}</Text>
                  <Ionicons name={languagesOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#D1D5DB" />
                </TouchableOpacity>
                {languagesOpen && APP_LANGUAGES.map(({ code, flag, name }) => (
                  <TouchableOpacity
                    key={code}
                    style={styles.languageOption}
                    onPress={() => { changeLanguage(code); setLanguagesOpen(false); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: code === currentLanguageCode }}
                  >
                    <Text style={[styles.languageText, code === currentLanguageCode && styles.languageTextSelected]}>{flag} {name}</Text>
                    {code === currentLanguageCode && <Ionicons name="checkmark" size={18} color="#E8743B" />}
                  </TouchableOpacity>
                ))}
                {GUEST_INFO_ITEMS.map(renderItem)}
              </>
            ) : (
              <>
                <Text style={styles.section}>{t('home.yourTools')}</Text>
                {TOOLS.map(renderItem)}
                <View style={styles.divider} />
                {ACCOUNT_ITEMS.map(renderItem)}
              </>
            )}
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
  guestValue: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginTop: 4, marginBottom: 6 },
  itemValue: { fontSize: 14, color: '#6b7280' },
  languageOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingLeft: 36 },
  languageText: { fontSize: 15, color: '#374151' },
  languageTextSelected: { fontWeight: '700', color: '#111827' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 6 },
});

export default AccountMenuButton;
