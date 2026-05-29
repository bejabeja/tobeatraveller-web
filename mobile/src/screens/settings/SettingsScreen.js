import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Linking, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import {
  deleteMyAccount, logoutUser, selectAuthUser, selectMe,
} from '@tobeatraveller/shared';
import { shadow } from '../../utils/styles';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

const SettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const user = meDetail ?? authUser;

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'es';

  const [deleting, setDeleting] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteInput !== user?.username) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      dispatch(logoutUser());
    } catch {
      Alert.alert(t('common.cancel'), t('errors.deleteAccountFailed'));
      setDeleting(false);
    }
  };

  const handleDownloadData = () => {
    const url = `${API_URL}/users/me/export`;
    Linking.openURL(url).catch(() =>
      Alert.alert(t('errors.somethingWrong'), url)
    );
  };

  return (
    <View style={styles.container}>
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Language */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.language').toUpperCase()}</Text>
            <View style={styles.langToggle}>
              <TouchableOpacity
                style={[styles.langBtn, currentLang === 'es' && styles.langBtnActive]}
                onPress={() => i18n.changeLanguage('es')}
              >
                <Text style={[styles.langBtnText, currentLang === 'es' && styles.langBtnTextActive]}>
                  🇪🇸 Español
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, currentLang === 'en' && styles.langBtnActive]}
                onPress={() => i18n.changeLanguage('en')}
              >
                <Text style={[styles.langBtnText, currentLang === 'en' && styles.langBtnTextActive]}>
                  🇬🇧 English
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Your data */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.yourData').toUpperCase()}</Text>
            <Text style={styles.cardDesc}>{t('editProfile.yourDataDesc')}</Text>
            <TouchableOpacity style={styles.linkBtn} onPress={handleDownloadData}>
              <Text style={styles.linkBtnText}>{t('editProfile.downloadData')} →</Text>
            </TouchableOpacity>
          </View>

          {/* Danger zone */}
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>{t('settings.dangerZone')}</Text>
            <Text style={styles.dangerDesc}>{t('editProfile.dangerZoneDesc')}</Text>
            {!showDeleteConfirm ? (
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => { setDeleteInput(''); setShowDeleteConfirm(true); }}
              >
                <Text style={styles.dangerBtnText}>{t('editProfile.deleteAccount')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.deleteConfirm}>
                <Text style={styles.deleteConfirmLabel}>
                  {t('editProfile.deleteAccountDesc', { username: user?.username })}
                </Text>
                <TextInput
                  style={[styles.input, { marginTop: 6 }]}
                  value={deleteInput}
                  onChangeText={setDeleteInput}
                  placeholder={user?.username}
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.deleteConfirmActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dangerBtn,
                      { flex: 1 },
                      (deleteInput !== user?.username || deleting) && styles.btnDisabled,
                    ]}
                    onPress={handleDeleteAccount}
                    disabled={deleteInput !== user?.username || deleting}
                  >
                    <Text style={styles.dangerBtnText}>
                      {deleting ? t('editProfile.deleting') : t('editProfile.deleteAccount')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    ...shadow(2, 0.05, 6, 2),
  },
  headerBack: { padding: 8, marginRight: 4 },
  headerBackText: { fontSize: 20, color: '#374151' },
  headerTitle: {
    flex: 1, fontSize: 17, fontWeight: '700',
    color: '#111827', textAlign: 'center',
  },
  headerSpacer: { width: 44 },

  scroll: { padding: 16, gap: 14 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    ...shadow(2, 0.06, 8, 2),
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14,
  },
  cardDesc: {
    fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 12,
  },
  linkBtn: { alignSelf: 'flex-start' },
  linkBtnText: { fontSize: 14, fontWeight: '600', color: '#0077b6' },

  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 11, paddingHorizontal: 13,
    fontSize: 15, color: '#111827',
  },

  langToggle: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 11,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    alignItems: 'center', backgroundColor: '#f9fafb',
  },
  langBtnActive: { borderColor: '#0077b6', backgroundColor: '#eff6ff' },
  langBtnText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  langBtnTextActive: { color: '#0077b6', fontWeight: '700' },

  dangerCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#fecaca',
  },
  dangerTitle: { fontSize: 14, fontWeight: '700', color: '#dc2626', marginBottom: 8 },
  dangerDesc: { fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 12 },
  dangerBtn: {
    backgroundColor: '#dc2626', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  dangerBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.4 },

  deleteConfirm: { gap: 8 },
  deleteConfirmLabel: { fontSize: 13, color: '#374151' },
  deleteConfirmActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 10, paddingVertical: 11, alignItems: 'center',
  },
  cancelBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
});

export default SettingsScreen;
