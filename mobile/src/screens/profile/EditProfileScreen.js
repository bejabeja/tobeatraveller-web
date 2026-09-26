import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  checkUsernameAvailable, initAuthUser, reverseGeocode,
  selectMe, selectAuthUser,
  setUserInfo, updateUser, formatDate, profilePath,
} from '@tobeatraveller/shared';
import { shadow } from '../../utils/styles';
import { GEOAPIFY_KEY, WEB_URL } from '../../utils/config';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { UseCurrentLocationButton } from '../../components/UseCurrentLocationButton';

// The API's answer when the name changed less than 30 days ago (e.g. on
// another device, where the field wasn't locked yet).
const USERNAME_COOLDOWN_ERROR = 'The username can only be changed';

// "tobeatraveller.com", as the profile's address is written for people.
const WEB_HOST = WEB_URL.replace(/^https?:\/\//, '');

const EditProfileScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const user = meDetail ?? authUser;

  const [fields, setFields] = useState({
    name: '', username: '', bio: '', location: '', about: '',
  });
  const [avatarUri, setAvatarUri] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const usernameTimer = useRef(null);
  const { getCurrentLocation, loading: locating } = useCurrentLocation();

  useEffect(() => {
    if (user) {
      setFields({
        name:     user.name     ?? '',
        username: user.username ?? '',
        bio:      user.bio      ?? '',
        location: user.location ?? '',
        about:    user.about    ?? '',
      });
    }
  }, [user?.id]);

  useEffect(() => {
    const val = fields.username;
    if (!val || val.length < 2 || /\s/.test(val) || val === user?.username) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus('checking');
    clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(async () => {
      const available = await checkUsernameAvailable(val);
      setUsernameStatus(available === null ? null : available ? 'available' : 'taken');
    }, 500);
    return () => clearTimeout(usernameTimer.current);
  }, [fields.username]);

  const setField = (key, value) => {
    setFields(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: null }));
    setIsDirty(true);
  };

  const handleUseCurrentLocation = async () => {
    let coords;
    try {
      coords = await getCurrentLocation();
    } catch {
      Alert.alert(t('common.locationPermissionDeniedToast'));
      return;
    }
    try {
      const place = await reverseGeocode({ ...coords, apiKey: GEOAPIFY_KEY });
      if (place) setField('location', place.label);
      else Alert.alert(t('common.locationErrorToast'));
    } catch {
      Alert.alert(t('common.locationErrorToast'));
    }
  };

  const validate = () => {
    const e = {};
    if (!fields.username.trim()) e.username = t('errors.usernameRequired');
    else if (fields.username.length < 2) e.username = t('errors.usernameMin');
    else if (fields.username.length > 50) e.username = t('errors.usernameMax');
    else if (/\s/.test(fields.username)) e.username = t('errors.usernameNoSpaces');
    if (fields.name.length > 50) e.name = t('errors.nameMax');
    if (fields.bio.length > 160) e.bio = t('errors.bioMax');
    if (fields.about.length > 1000) e.about = t('errors.aboutMax');
    if (fields.location.length > 50) e.location = t('errors.locationMax');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('editProfile.permissionNeeded'), t('editProfile.permissionNeededDesc'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarUri(result.assets[0].uri);
      setRemoveAvatar(false);
      setIsDirty(true);
    }
  };

  const handleRemoveAvatar = () => {
    setRemoveAvatar(true);
    setAvatarUri(null);
    setIsDirty(true);
  };

  const handleUndoRemove = () => {
    setRemoveAvatar(false);
    setIsDirty(true);
  };

  const handleCancel = () => {
    if (isDirty || avatarUri || removeAvatar) {
      Alert.alert(t('editProfile.discardChanges'), t('editProfile.discardChangesDesc'), [
        { text: t('editProfile.keepEditing'), style: 'cancel' },
        { text: t('editProfile.discard'), style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  const hasPhoto = Boolean(avatarUri) || Boolean(user?.avatarUrl?.includes('res.cloudinary.com'));
  // Changed less than 30 days ago: locked until then (the API refuses it too).
  const usernameLockedUntil = meDetail?.usernameChangeAvailableAt;
  const usernameEdited = !usernameLockedUntil && fields.username
    && fields.username.toLowerCase() !== user?.username?.toLowerCase();
  // The name is the profile's address (and invite code): shown as it will be.
  const usernameNotes = [
    t('editProfile.usernameAddress', { address: `${WEB_HOST}${profilePath(fields.username || user?.username || '')}` }),
    usernameLockedUntil && t('editProfile.usernameLockedUntil', { date: formatDate(usernameLockedUntil, i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) }),
    // Before saving, not after: the old address stops working.
    usernameEdited && t('editProfile.usernameChangeLimit'),
  ].filter(Boolean);

  const handleSave = async () => {
    if (!validate() || usernameStatus === 'taken' || usernameStatus === 'checking') return;
    setSaving(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append('user', JSON.stringify({
        ...fields,
        ...(removeAvatar && { removeAvatar: true }),
      }));
      if (avatarUri) {
        const filename = avatarUri.split('/').pop();
        const ext = filename.split('.').pop().toLowerCase();
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        formData.append('avatar', { uri: avatarUri, name: filename, type: mime });
      }
      await updateUser(formData);
      const refreshes = [dispatch(initAuthUser())];
      if (user?.id) refreshes.push(dispatch(setUserInfo(user.id)));
      await Promise.all(refreshes);
      navigation.goBack();
    } catch (err) {
      setSubmitError(err?.message?.startsWith(USERNAME_COOLDOWN_ERROR)
        ? t('editProfile.usernameChangeLimit')
        : err?.message || t('errors.updateProfileFailed'));
    } finally {
      setSaving(false);
    }
  };

  const avatarSource = removeAvatar
    ? null
    : avatarUri
      ? { uri: avatarUri }
      : user?.avatarUrl
        ? { uri: user.avatarUrl }
        : null;

  const initial = user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';

  if (!user) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#6b7280' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={handleCancel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editProfile.title')}</Text>
        <TouchableOpacity
          style={[styles.headerSave, (saving || usernameStatus === 'taken' || usernameStatus === 'checking') && styles.headerSaveDisabled]}
          onPress={handleSave}
          disabled={saving || usernameStatus === 'taken' || usernameStatus === 'checking'}
        >
          <Text style={styles.headerSaveText}>{saving ? t('common.saving') : t('common.save')}</Text>
        </TouchableOpacity>
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
            <Text style={styles.cardTitle}>{t('editProfile.sectionProfile')}</Text>

            {/* Avatar: the photo beside its actions */}
            <View style={styles.avatarRow}>
              <TouchableOpacity
                style={[styles.avatarWrapper, removeAvatar && styles.avatarWrapperRemove]}
                onPress={removeAvatar ? undefined : handlePickAvatar}
                activeOpacity={removeAvatar ? 1 : 0.75}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {avatarSource ? (
                  <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>
                )}
                <View style={[styles.avatarBadge, removeAvatar && styles.avatarBadgeRemove]}>
                  <Ionicons name={removeAvatar ? 'trash-outline' : 'camera-outline'} size={15} color="#fff" />
                </View>
              </TouchableOpacity>

              <View style={styles.avatarActions}>
                {removeAvatar ? (
                  <TouchableOpacity onPress={handleUndoRemove} style={styles.avatarButton} accessibilityRole="button">
                    <Text style={styles.avatarButtonText}>{t('editProfile.undoRemove')}</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarButton} accessibilityRole="button">
                      <Text style={styles.avatarButtonText}>{hasPhoto ? t('editProfile.changePhoto') : t('editProfile.addPhoto')}</Text>
                    </TouchableOpacity>
                    {hasPhoto && (
                      <TouchableOpacity onPress={handleRemoveAvatar} accessibilityRole="button">
                        <Text style={styles.avatarRemoveText}>{t('editProfile.removePhoto')}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>


            <Field label={t('editProfile.nameLabel')} error={errors.name} hint={counterHint(fields.name, 50)}>
              <TextInput
                style={styles.input}
                value={fields.name}
                onChangeText={v => setField('name', v)}
                placeholder={t('editProfile.namePlaceholder')}
                placeholderTextColor="#9ca3af"
                maxLength={50}
              />
            </Field>

            <Field label={t('editProfile.usernameLabel')} error={errors.username} hint={counterHint(fields.username, 50)} notes={usernameNotes}>
              <TextInput
                style={[styles.input, usernameLockedUntil && styles.inputLocked]}
                editable={!usernameLockedUntil}
                value={fields.username}
                onChangeText={v => setField('username', v)}
                placeholder={t('editProfile.usernamePlaceholder')}
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={50}
              />
              {usernameStatus && (
                <View style={[styles.usernamePill, styles[`pill_${usernameStatus}`]]}>
                  <Text style={[styles.usernameText, styles[`pillText_${usernameStatus}`]]}>
                    {usernameStatus === 'checking'  && t('common.checking')}
                    {usernameStatus === 'available' && t('common.available')}
                    {usernameStatus === 'taken'     && t('editProfile.alreadyTaken')}
                  </Text>
                </View>
              )}
            </Field>


            <Field label={t('editProfile.locationLabel')} error={errors.location}>
              <TextInput
                style={styles.input}
                value={fields.location}
                onChangeText={v => setField('location', v)}
                placeholder={t('editProfile.locationPlaceholder')}
                placeholderTextColor="#9ca3af"
                maxLength={50}
              />
              <UseCurrentLocationButton onPress={handleUseCurrentLocation} loading={locating} />
            </Field>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('editProfile.sectionAbout')}</Text>

            <Field label={t('editProfile.bioLabel')} error={errors.bio} hint={counterHint(fields.bio, 160)} notes={[t('editProfile.bioHint')]}>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={fields.bio}
                onChangeText={v => setField('bio', v)}
                placeholder={t('editProfile.bioPlaceholder')}
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={160}
              />
            </Field>


            <Field label={t('editProfile.aboutLabel')} error={errors.about} hint={counterHint(fields.about, 1000)} notes={[t('editProfile.aboutHint')]}>
              <TextInput
                style={[styles.input, styles.textareaLarge]}
                value={fields.about}
                onChangeText={v => setField('about', v)}
                placeholder={t('editProfile.aboutPlaceholder')}
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={1000}
              />
            </Field>
          </View>

          {submitError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// Counters show once a field is this full, not on every short field.
const COUNTER_FROM = 0.85;
const counterHint = (value, max) => (value.length >= max * COUNTER_FROM ? `${value.length}/${max}` : undefined);

// `hint`: short, beside the label (a counter). `notes`: sentences under the field.
const Field = ({ label, error, hint, notes = [], children }) => (
  <View style={fieldStyles.wrapper}>
    <View style={fieldStyles.labelRow}>
      <Text style={fieldStyles.label}>{label}</Text>
      {hint && <Text style={[fieldStyles.hint, fieldStyles.hintWarn]}>{hint}</Text>}
    </View>
    {children}
    {error && <Text style={fieldStyles.error}>{error}</Text>}
    {notes.map(note => <Text key={note} style={fieldStyles.note}>{note}</Text>)}
  </View>
);

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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  headerSave: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 16,
  },
  headerSaveDisabled: { opacity: 0.5 },
  headerSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scroll: { padding: 16, gap: 14 },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatarWrapper: { width: 88, height: 88, position: 'relative' },
  avatarWrapperRemove: { opacity: 0.7 },
  avatar: { width: '100%', height: '100%', borderRadius: 44 },
  avatarFallback: {
    width: '100%', height: '100%', borderRadius: 44,
    backgroundColor: '#E8743B', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 36, fontWeight: '700' },
  // Always visible, not only on press: it says the photo can change.
  avatarBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#fff',
    backgroundColor: '#E8743B', alignItems: 'center', justifyContent: 'center',
  },
  avatarBadgeRemove: { backgroundColor: '#ef4444' },
  avatarActions: { alignItems: 'flex-start', gap: 8 },
  avatarButton: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  avatarButtonText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  avatarRemoveText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    ...shadow(2, 0.06, 8, 2),
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },

  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 11, paddingHorizontal: 13,
    fontSize: 15, color: '#111827',
  },
  inputLocked: { opacity: 0.55 },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  textareaLarge: { minHeight: 120, textAlignVertical: 'top' },

  usernamePill: {
    alignSelf: 'flex-end', borderRadius: 999, marginTop: 4,
    paddingVertical: 3, paddingHorizontal: 10,
  },
  pill_checking:  { backgroundColor: '#f1f5f9' },
  pill_available: { backgroundColor: '#f0fdf4' },
  pill_taken:     { backgroundColor: '#fef2f2' },
  usernameText: { fontSize: 12, fontWeight: '600' },
  pillText_checking:  { color: '#6b7280' },
  pillText_available: { color: '#16a34a' },
  pillText_taken:     { color: '#dc2626' },

  errorBanner: {
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#fecaca',
  },
  errorBannerText: { color: '#dc2626', fontSize: 14 },

});

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 12, color: '#9ca3af' },
  hintWarn: { color: '#f59e0b' },
  error: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  note: { fontSize: 12, lineHeight: 17, color: '#6b7280', marginTop: 5 },
});

export default EditProfileScreen;
