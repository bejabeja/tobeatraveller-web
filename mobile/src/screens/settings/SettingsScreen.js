import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import {
  changePassword, deleteMyAccount, exportMyData, fetchNotificationPreferences,
  logoutUser, selectAuthUser, selectMe, updateNotificationPreferences,
} from '@tobeatraveller/shared';
import { shadow } from '../../utils/styles';
import { RichText } from '../../components/RichText';
import { registerForPushNotifications } from '../../utils/pushNotifications';
import { clearDeviceSessionData } from '../../utils/session';
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent';
import { ANALYTICS_CONSENT } from '../../utils/analytics';

const NOTIFICATION_PREFERENCE_TOGGLES = [
  // Push only exists in the native app, not in the web build of mobile.
  ...(Platform.OS === 'web' ? [] : [{ key: 'pushEnabled', labelKey: 'settings.pushNotifications' }]),
  { key: 'notifyOnComment', labelKey: 'settings.notifyOnComment' },
  { key: 'notifyOnLike', labelKey: 'settings.notifyOnLike' },
  { key: 'notifyOnFollow', labelKey: 'settings.notifyOnFollow' },
];

const SettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { consent: analyticsConsent, answer: answerAnalytics } = useAnalyticsConsent();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const user = meDetail ?? authUser;

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'es';

  const [deleting, setDeleting] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState(null);
  const [updatingPreferenceKey, setUpdatingPreferenceKey] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchNotificationPreferences()
      .then(setNotificationPreferences)
      .catch(() => Alert.alert(t('errors.somethingWrong'), t('errors.notificationPreferencesLoadFailed')));
  }, [t]);

  if (!user) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#E8743B" />
      </View>
    );
  }

  const handleDeleteAccount = async () => {
    if (deleteInput !== user?.username) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      await clearDeviceSessionData();
      dispatch(logoutUser());
    } catch {
      Alert.alert(t('common.cancel'), t('errors.deleteAccountFailed'));
      setDeleting(false);
    }
  };

  const handleTogglePreference = async (key) => {
    const previousValue = notificationPreferences[key];
    setUpdatingPreferenceKey(key);
    setNotificationPreferences({ ...notificationPreferences, [key]: !previousValue });
    try {
      const updated = await updateNotificationPreferences({ [key]: !previousValue });
      setNotificationPreferences(updated);
      // Asks for the OS permission again if it was never granted on this device.
      if (key === 'pushEnabled' && updated.pushEnabled) registerForPushNotifications(i18n.language);
    } catch {
      setNotificationPreferences({ ...notificationPreferences, [key]: previousValue });
      Alert.alert(t('errors.somethingWrong'), t('errors.notificationPreferencesUpdateFailed'));
    } finally {
      setUpdatingPreferenceKey(null);
    }
  };

  const closePasswordForm = () => {
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError('');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError(t('errors.passwordMin'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError(t('errors.passwordsDontMatch'));
      return;
    }
    setPasswordError('');
    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      closePasswordForm();
      Alert.alert(t('editProfile.passwordChanged'));
    } catch (err) {
      setPasswordError(err.message || t('errors.changePasswordFailed'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDownloadData = async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      const file = new File(Paths.cache, 'tobeatraveller-my-data.json');
      file.write(JSON.stringify(data, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: t('editProfile.downloadData') });
      } else {
        Alert.alert(t('errors.somethingWrong'));
      }
    } catch {
      Alert.alert(t('errors.somethingWrong'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('common.back')}
        >
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
          {/* Account */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.account').toUpperCase()}</Text>
            {!showPasswordForm ? (
              <TouchableOpacity style={styles.linkBtn} onPress={() => setShowPasswordForm(true)}>
                <Text style={styles.linkBtnText}>{t('editProfile.changePassword')} →</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordForm}>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder={t('editProfile.currentPasswordLabel')}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('editProfile.newPasswordLabel')}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder={t('editProfile.confirmNewPasswordLabel')}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                />
                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
                <View style={styles.deleteConfirmActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={closePasswordForm}
                    disabled={changingPassword}
                  >
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      { flex: 1 },
                      (!currentPassword || !newPassword || !confirmNewPassword || changingPassword) && styles.btnDisabled,
                    ]}
                    onPress={handleChangePassword}
                    disabled={!currentPassword || !newPassword || !confirmNewPassword || changingPassword}
                  >
                    <Text style={styles.primaryBtnText}>
                      {changingPassword ? t('editProfile.changingPassword') : t('editProfile.changePassword')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

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

          {/* Notifications */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.notifications').toUpperCase()}</Text>
            {notificationPreferences && NOTIFICATION_PREFERENCE_TOGGLES.map(({ key, labelKey }, index) => (
              <View
                key={key}
                style={[styles.toggleRow, index > 0 && styles.toggleRowSpacing]}
              >
                <Text style={styles.toggleLabel}>{t(labelKey)}</Text>
                <Switch
                  value={notificationPreferences[key]}
                  onValueChange={() => handleTogglePreference(key)}
                  disabled={updatingPreferenceKey === key}
                  trackColor={{ false: '#e5e7eb', true: '#E8743B' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>

          {/* Analytics: the same answer as the first-launch notice */}
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('analyticsConsent.setting')}</Text>
              <Switch
                value={analyticsConsent === ANALYTICS_CONSENT.GRANTED}
                onValueChange={answerAnalytics}
                accessibilityLabel={t('analyticsConsent.setting')}
                trackColor={{ false: '#e5e7eb', true: '#E8743B' }}
                thumbColor="#fff"
              />
            </View>
            <Text style={[styles.cardDesc, { marginTop: 8 }]}>{t('analyticsConsent.settingHint')}</Text>
          </View>

          {/* Your data */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.yourData').toUpperCase()}</Text>
            <Text style={styles.cardDesc}>{t('editProfile.yourDataDesc')}</Text>
            <TouchableOpacity style={styles.linkBtn} onPress={handleDownloadData} disabled={exporting}>
              <Text style={styles.linkBtnText}>{exporting ? t('common.saving') : t('editProfile.downloadData')} →</Text>
            </TouchableOpacity>
          </View>

          {/* Legal */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.legal').toUpperCase()}</Text>
            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Terms')}>
              <Text style={styles.linkBtnText}>{t('legalTerms.documentTitle')} →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linkBtn, { marginTop: 10 }]} onPress={() => navigation.navigate('PrivacyPolicy')}>
              <Text style={styles.linkBtnText}>{t('legalPrivacy.documentTitle')} →</Text>
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
                <RichText
                  text={t('editProfile.deleteAccountDesc', { username: user?.username })}
                  style={styles.deleteConfirmLabel}
                  boldStyle={styles.deleteConfirmLabelBold}
                />
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
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },

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
  linkBtnText: { fontSize: 14, fontWeight: '600', color: '#E8743B' },

  passwordForm: { gap: 0 },
  errorText: { fontSize: 13, color: '#dc2626', marginTop: 8 },
  primaryBtn: {
    backgroundColor: '#E8743B', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
  },
  toggleRowSpacing: { marginTop: 12 },
  toggleLabel: { flex: 1, fontSize: 14, color: '#111827' },

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
  langBtnActive: { borderColor: '#E8743B', backgroundColor: '#FFF0E8' },
  langBtnText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  langBtnTextActive: { color: '#E8743B', fontWeight: '700' },

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
  deleteConfirmLabelBold: { fontWeight: '700' },
  deleteConfirmActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 10, paddingVertical: 11, alignItems: 'center',
  },
  cancelBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
});

export default SettingsScreen;
