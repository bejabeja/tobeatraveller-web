import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import {
  APP_LANGUAGES, changePassword, deleteMyAccount, exportMyData, fetchNotificationPreferences,
  logoutUser, selectAuthUser, selectMe, toAppLanguage, updateNotificationPreferences,
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
  { key: 'notifyOnFriendStamps', labelKey: 'settings.notifyOnFriendStamps' },
];

// One row per setting, the same shape whatever it is: its name (and a line
// under it) on the left, and on the right its value, a control passed as
// `children`, or a chevron when it can be tapped. `option` rows are the
// choices a row unfolds, `selected` ticking the current one.
const SettingsRow = ({
  label, hint, value, children, onPress, disabled, expanded, first = false, danger = false, option = false, selected = false,
}) => {
  const trailing = children ?? (
    <View style={styles.rowTrailing}>
      {!!value && <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>}
      {option && selected && <Ionicons name="checkmark" size={18} color="#E8743B" />}
      {onPress && !option && (
        <Ionicons name={expanded ? 'chevron-up' : expanded === false ? 'chevron-down' : 'chevron-forward'} size={16} color="#9ca3af" />
      )}
    </View>
  );
  const content = (
    <>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger, option && selected && styles.rowLabelSelected]}>{label}</Text>
        {!!hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      {trailing}
    </>
  );
  const style = [styles.row, first && styles.rowFirst, option && styles.rowOption];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, ...(option ? { selected } : {}), ...(expanded !== undefined ? { expanded } : {}) }}
    >
      {content}
    </TouchableOpacity>
  );
};

const SettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { consent: analyticsConsent, answer: answerAnalytics } = useAnalyticsConsent();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const user = meDetail ?? authUser;

  const currentLang = toAppLanguage(i18n.language);
  const currentLanguage = APP_LANGUAGES.find(language => language.code === currentLang);
  const [languagesOpen, setLanguagesOpen] = useState(false);

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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.account')}</Text>
            {!!user?.email && <SettingsRow first label={t('auth.emailLabel')} value={user.email} />}
            <SettingsRow
              first={!user?.email}
              label={t('settings.language')}
              value={`${currentLanguage.flag} ${currentLanguage.name}`}
              expanded={languagesOpen}
              onPress={() => setLanguagesOpen(open => !open)}
            />
            {languagesOpen && APP_LANGUAGES.map(({ code, flag, name }) => (
              <SettingsRow
                key={code}
                option
                label={`${flag} ${name}`}
                selected={code === currentLang}
                onPress={() => { i18n.changeLanguage(code); setLanguagesOpen(false); }}
              />
            ))}
            <SettingsRow
              label={t('editProfile.changePassword')}
              expanded={showPasswordForm}
              onPress={() => (showPasswordForm ? closePasswordForm() : setShowPasswordForm(true))}
            />
            {showPasswordForm && (
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

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.notifications')}</Text>
            {notificationPreferences && NOTIFICATION_PREFERENCE_TOGGLES.map(({ key, labelKey }, index) => (
              <SettingsRow key={key} first={index === 0} label={t(labelKey)}>
                <Switch
                  value={notificationPreferences[key]}
                  onValueChange={() => handleTogglePreference(key)}
                  disabled={updatingPreferenceKey === key}
                  accessibilityLabel={t(labelKey)}
                  trackColor={{ false: '#e5e7eb', true: '#E8743B' }}
                  thumbColor="#fff"
                />
              </SettingsRow>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.yourData')}</Text>
            {/* The same answer as the first-launch notice. */}
            <SettingsRow first label={t('analyticsConsent.setting')} hint={t('analyticsConsent.settingHint')}>
              <Switch
                value={analyticsConsent === ANALYTICS_CONSENT.GRANTED}
                onValueChange={answerAnalytics}
                accessibilityLabel={t('analyticsConsent.setting')}
                trackColor={{ false: '#e5e7eb', true: '#E8743B' }}
                thumbColor="#fff"
              />
            </SettingsRow>
            <SettingsRow
              label={exporting ? t('common.saving') : t('editProfile.downloadData')}
              hint={t('editProfile.yourDataDesc')}
              onPress={handleDownloadData}
              disabled={exporting}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.legal')}</Text>
            <SettingsRow first label={t('legalTerms.documentTitle')} onPress={() => navigation.navigate('Terms')} />
            <SettingsRow label={t('legalPrivacy.documentTitle')} onPress={() => navigation.navigate('PrivacyPolicy')} />
          </View>

          <View style={[styles.card, styles.dangerCard]}>
            <Text style={[styles.cardTitle, styles.dangerTitle]}>{t('settings.dangerZone')}</Text>
            <SettingsRow
              first
              danger
              label={t('editProfile.deleteAccount')}
              hint={t('editProfile.dangerZoneDesc')}
              expanded={showDeleteConfirm}
              onPress={() => { setDeleteInput(''); setShowDeleteConfirm(open => !open); }}
            />
            {showDeleteConfirm && (
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
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
    ...shadow(2, 0.06, 8, 2),
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },

  // Tall enough to tap comfortably, with a line between rows.
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    minHeight: 48, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb',
  },
  rowFirst: { borderTopWidth: 0 },
  rowOption: { paddingLeft: 12 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, color: '#111827' },
  rowLabelDanger: { color: '#dc2626', fontWeight: '600' },
  rowLabelSelected: { color: '#E8743B', fontWeight: '600' },
  rowHint: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  rowTrailing: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, maxWidth: '55%' },
  rowValue: { fontSize: 14, color: '#6b7280', flexShrink: 1 },

  passwordForm: { gap: 0, paddingBottom: 12 },
  errorText: { fontSize: 13, color: '#dc2626', marginTop: 8 },
  primaryBtn: {
    backgroundColor: '#E8743B', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 11, paddingHorizontal: 13,
    fontSize: 15, color: '#111827',
  },

  dangerCard: { borderWidth: 1, borderColor: '#fecaca' },
  dangerTitle: { color: '#dc2626' },
  dangerBtn: {
    backgroundColor: '#dc2626', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  dangerBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.4 },

  deleteConfirm: { gap: 8, paddingBottom: 12 },
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
