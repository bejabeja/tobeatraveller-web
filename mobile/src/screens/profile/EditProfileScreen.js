import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  checkUsernameAvailable, deleteMyAccount, initAuthUser,
  logoutUser, selectMe, selectAuthUser,
  setUserInfo, updateUser,
} from '@tobeatraveller/shared';
import { shadow } from '../../utils/styles';

const EditProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const user = meDetail ?? authUser;

  const [fields, setFields] = useState({
    name: '', username: '', bio: '', location: '', about: '',
  });
  const [avatarUri, setAvatarUri] = useState(null);   // new local image
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const usernameTimer = useRef(null);

  // Populate fields when user loads
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

  // Username availability check
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

  const validate = () => {
    const e = {};
    if (!fields.username.trim()) e.username = 'Username is required';
    else if (fields.username.length < 2) e.username = 'At least 2 characters';
    else if (fields.username.length > 50) e.username = 'Max 50 characters';
    else if (/\s/.test(fields.username)) e.username = 'No spaces allowed';
    if (fields.name.length > 50) e.name = 'Max 50 characters';
    if (fields.bio.length > 160) e.bio = 'Max 160 characters';
    if (fields.about.length > 1000) e.about = 'Max 1000 characters';
    if (fields.location.length > 50) e.location = 'Max 50 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to change your avatar.');
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
      Alert.alert('Discard changes?', 'You have unsaved changes.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    if (!validate() || usernameStatus === 'taken') return;
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
      setSubmitError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== user?.username) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      dispatch(logoutUser());
    } catch {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
      setDeleting(false);
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
        <Text style={{ color: '#6b7280' }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={styles.headerBack} onPress={handleCancel}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <TouchableOpacity
          style={[styles.headerSave, (saving || usernameStatus === 'taken') && styles.headerSaveDisabled]}
          onPress={handleSave}
          disabled={saving || usernameStatus === 'taken'}
        >
          <Text style={styles.headerSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
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
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={[styles.avatarWrapper, removeAvatar && styles.avatarWrapperRemove]}
              onPress={removeAvatar ? undefined : handlePickAvatar}
              activeOpacity={removeAvatar ? 1 : 0.75}
            >
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
              <View style={[styles.avatarOverlay, removeAvatar && styles.avatarOverlayRemove]}>
                <Text style={styles.avatarOverlayIcon}>{removeAvatar ? '🗑' : '📷'}</Text>
              </View>
            </TouchableOpacity>

            {removeAvatar ? (
              <TouchableOpacity onPress={handleUndoRemove} style={styles.avatarAction}>
                <Text style={styles.avatarActionText}>↩ Undo remove</Text>
              </TouchableOpacity>
            ) : (user?.avatarUrl || avatarUri) ? (
              <TouchableOpacity onPress={handleRemoveAvatar} style={styles.avatarAction}>
                <Text style={[styles.avatarActionText, { color: '#ef4444' }]}>Remove photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Basic info card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic info</Text>

            <Field label="Name" error={errors.name}>
              <TextInput
                style={styles.input}
                value={fields.name}
                onChangeText={v => setField('name', v)}
                placeholder="Your display name"
                placeholderTextColor="#9ca3af"
                maxLength={50}
              />
            </Field>

            <Field label="Username" error={errors.username}>
              <TextInput
                style={styles.input}
                value={fields.username}
                onChangeText={v => setField('username', v)}
                placeholder="your_username"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={50}
              />
              {usernameStatus && (
                <View style={[styles.usernamePill, styles[`pill_${usernameStatus}`]]}>
                  <Text style={[styles.usernameText, styles[`pillText_${usernameStatus}`]]}>
                    {usernameStatus === 'checking'  && '…'}
                    {usernameStatus === 'available' && '✓ Available'}
                    {usernameStatus === 'taken'     && '✗ Already taken'}
                  </Text>
                </View>
              )}
            </Field>

            <Field label="Bio" error={errors.bio} hint={`${fields.bio.length}/160`} hintWarn={fields.bio.length > 140}>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={fields.bio}
                onChangeText={v => setField('bio', v)}
                placeholder="A short description of yourself…"
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={160}
              />
            </Field>
          </View>

          {/* Location & About card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Location & About</Text>

            <Field label="Location" error={errors.location}>
              <TextInput
                style={styles.input}
                value={fields.location}
                onChangeText={v => setField('location', v)}
                placeholder="City, Country"
                placeholderTextColor="#9ca3af"
                maxLength={50}
              />
            </Field>

            <Field label="About" error={errors.about} hint={`${fields.about.length}/1000`} hintWarn={fields.about.length > 900}>
              <TextInput
                style={[styles.input, styles.textareaLarge]}
                value={fields.about}
                onChangeText={v => setField('about', v)}
                placeholder="Tell the community about yourself and your travel style…"
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

          {/* Danger zone */}
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>⚠️ Danger zone</Text>
            <Text style={styles.dangerDesc}>
              Deleting your account permanently removes all your itineraries, likes, and followers. This cannot be undone.
            </Text>
            {!showDeleteConfirm ? (
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => { setDeleteInput(''); setShowDeleteConfirm(true); }}
              >
                <Text style={styles.dangerBtnText}>Delete my account</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.deleteConfirm}>
                <Text style={styles.deleteConfirmLabel}>
                  Type <Text style={{ fontWeight: '700' }}>{user?.username}</Text> to confirm
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
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dangerBtn, { flex: 1 }, (deleteInput !== user?.username || deleting) && styles.btnDisabled]}
                    onPress={handleDeleteAccount}
                    disabled={deleteInput !== user?.username || deleting}
                  >
                    <Text style={styles.dangerBtnText}>{deleting ? 'Deleting…' : 'Delete account'}</Text>
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

const Field = ({ label, error, hint, hintWarn, children }) => (
  <View style={fieldStyles.wrapper}>
    <View style={fieldStyles.labelRow}>
      <Text style={fieldStyles.label}>{label}</Text>
      {hint && <Text style={[fieldStyles.hint, hintWarn && fieldStyles.hintWarn]}>{hint}</Text>}
    </View>
    {children}
    {error && <Text style={fieldStyles.error}>{error}</Text>}
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
    backgroundColor: '#0077b6', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 16,
  },
  headerSaveDisabled: { opacity: 0.5 },
  headerSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scroll: { padding: 16, gap: 14 },

  avatarSection: { alignItems: 'center', paddingVertical: 8 },
  avatarWrapper: {
    width: 96, height: 96, borderRadius: 48,
    overflow: 'hidden', position: 'relative',
    borderWidth: 3, borderColor: '#e5e7eb',
  },
  avatarWrapperRemove: { borderColor: '#fecaca', opacity: 0.7 },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%', height: '100%',
    backgroundColor: '#0077b6', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 36, fontWeight: '700' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarOverlayRemove: { backgroundColor: 'rgba(239,68,68,0.35)' },
  avatarOverlayIcon: { fontSize: 24 },
  avatarAction: { marginTop: 8 },
  avatarActionText: { fontSize: 13, color: '#0077b6', fontWeight: '600' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    ...shadow(2, 0.06, 8, 2),
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 11, paddingHorizontal: 13,
    fontSize: 15, color: '#111827',
  },
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

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 12, color: '#9ca3af' },
  hintWarn: { color: '#f59e0b' },
  error: { fontSize: 12, color: '#dc2626', marginTop: 4 },
});

export default EditProfileScreen;
