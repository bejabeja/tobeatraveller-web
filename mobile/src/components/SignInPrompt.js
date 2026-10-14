import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { shadow } from '../utils/styles';

export const SIGN_IN_REASONS = Object.freeze({
  LIKE: 'like',
  SAVE: 'save',
  FOLLOW: 'follow',
  FOLLOW_LIST: 'followList',
  COMMENT: 'comment',
  CREATE: 'create',
});

const SignInPromptContext = createContext(() => {});

// One answer for every action that needs an account, instead of each screen sending the visitor somewhere different.
export const useSignInPrompt = () => useContext(SignInPromptContext);

export const SignInPromptProvider = ({ navigate, children }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState(null);

  const promptSignIn = useCallback((nextReason) => setReason(nextReason), []);
  const close = () => setReason(null);
  const goTo = (screen) => {
    close();
    navigate(screen);
  };

  const sheetOptions = useMemo(() => [
    { screen: 'Register', labelKey: 'nav.createAccountBtn', primary: true },
    { screen: 'Login', labelKey: 'nav.login', primary: false },
  ], []);

  return (
    <SignInPromptContext.Provider value={promptSignIn}>
      {children}
      <Modal visible={!!reason} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('guestPrompt.notNow')}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} accessibilityViewIsModal>
            <Text style={styles.title} accessibilityRole="header">{t('guestPrompt.title')}</Text>
            {!!reason && <Text style={styles.message}>{t(`guestPrompt.${reason}`)}</Text>}
            {sheetOptions.map(({ screen, labelKey, primary }) => (
              <TouchableOpacity
                key={screen}
                style={[styles.button, primary ? styles.primaryButton : styles.secondaryButton]}
                onPress={() => goTo(screen)}
                accessibilityRole="button"
              >
                <Text style={primary ? styles.primaryText : styles.secondaryText}>{t(labelKey)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={close} accessibilityRole="button" style={styles.notNow}>
              <Text style={styles.notNowText}>{t('guestPrompt.notNow')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SignInPromptContext.Provider>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 22,
    ...shadow(8, 0.15, 16, 0),
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  message: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 18 },
  button: { borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  primaryButton: { backgroundColor: '#E8743B' },
  secondaryButton: { borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  notNow: { alignItems: 'center', paddingVertical: 8 },
  notNowText: { color: '#9ca3af', fontWeight: '600', fontSize: 14 },
});
