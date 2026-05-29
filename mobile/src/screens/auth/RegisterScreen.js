import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions, ImageBackground, KeyboardAvoidingView, Linking,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { checkUsernameAvailable, registerUser, selectAuthError } from '@tobeatraveller/shared';
import { shadow, textShadow } from '../../utils/styles';

const AUTH_BG = require('../../../assets/auth.webp');
const { height: SCREEN_H } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const authError = useSelector(selectAuthError);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [usernameStatus, setUsernameStatus] = useState(null); // null | "checking" | "available" | "taken"
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const timer = useRef(null);

  useEffect(() => {
    if (!username || username.length < 2 || /\s/.test(username)) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus('checking');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const available = await checkUsernameAvailable(username);
      if (available === null) { setUsernameStatus(null); return; }
      setUsernameStatus(available ? 'available' : 'taken');
    }, 500);
    return () => clearTimeout(timer.current);
  }, [username]);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email address';
    if (!username.trim()) e.username = 'Username is required';
    else if (username.length < 2) e.username = 'At least 2 characters';
    else if (username.length > 50) e.username = 'Max 50 characters';
    else if (/\s/.test(username)) e.username = 'No spaces allowed';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) e.confirmPassword = "Passwords don't match";
    if (!ageConfirmed) e.ageConfirmed = 'You must confirm you are at least 16 years old';
    if (!termsAccepted) e.termsAccepted = 'You must accept the Terms and Privacy Policy';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate() || usernameStatus === 'taken') return;
    setLoading(true);
    try {
      await dispatch(registerUser({ email: email.trim(), username: username.trim(), password, confirmPassword, termsAccepted, ageConfirmed }));
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field) => setErrors(p => ({ ...p, [field]: null }));

  return (
    <View style={styles.root}>
      <ImageBackground source={AUTH_BG} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(0,26,51,0.15)', 'rgba(0,26,51,0.72)']}
        locations={[0, 0.85]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Branding — flex:1 fills all space above the sheet */}
        <View style={[styles.branding, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.brandIcon}>🌍</Text>
          <Text style={styles.brandName}>Tobeatraveller</Text>
          <Text style={styles.tagline}>Your journey{'\n'}starts here.</Text>
        </View>

        {/* Sheet — flex:0 sizes to content */}
        <View style={styles.sheetOuter}>
          <View style={styles.sheetInner}>
            <ScrollView
              style={{ maxHeight: SCREEN_H * 0.72 }}
              contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 8) + 20 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.handle} />
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>Join the community of travellers</Text>

              <Field
                label="Email"
                value={email}
                onChangeText={v => { setEmail(v); clearError('email'); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
              />

              <View>
                <Field
                  label="Username"
                  value={username}
                  onChangeText={v => { setUsername(v); clearError('username'); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.username}
                />
                {usernameStatus && (
                  <View style={[styles.usernamePill, styles[`pill_${usernameStatus}`]]}>
                    <Text style={[styles.usernameText, styles[`pillText_${usernameStatus}`]]}>
                      {usernameStatus === 'checking' && '…'}
                      {usernameStatus === 'available' && '✓ Available'}
                      {usernameStatus === 'taken' && '✗ Already taken'}
                    </Text>
                  </View>
                )}
              </View>

              <Field
                label="Password"
                value={password}
                onChangeText={v => { setPassword(v); clearError('password'); }}
                secureTextEntry={!showPassword}
                error={errors.password}
                right={
                  <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                  </TouchableOpacity>
                }
              />

              <Field
                label="Confirm password"
                value={confirmPassword}
                onChangeText={v => { setConfirmPassword(v); clearError('confirmPassword'); }}
                secureTextEntry={!showConfirm}
                error={errors.confirmPassword}
                right={
                  <TouchableOpacity onPress={() => setShowConfirm(s => !s)} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
                  </TouchableOpacity>
                }
              />

              {/* Age + Terms consent */}
              <View style={styles.consentBox}>
                <TouchableOpacity
                  style={styles.consentRow}
                  onPress={() => { setAgeConfirmed(v => !v); setErrors(e => ({ ...e, ageConfirmed: null })); }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, ageConfirmed && styles.checkboxChecked, errors.ageConfirmed && styles.checkboxError]}>
                    {ageConfirmed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.consentText, errors.ageConfirmed && styles.consentTextError]}>
                    I confirm I am at least <Text style={[styles.consentBold, errors.ageConfirmed && styles.consentTextError]}>16 years old</Text>
                  </Text>
                </TouchableOpacity>
                {errors.ageConfirmed ? <Text style={styles.consentError}>{errors.ageConfirmed}</Text> : null}

                <TouchableOpacity
                  style={styles.consentRow}
                  onPress={() => { setTermsAccepted(v => !v); setErrors(e => ({ ...e, termsAccepted: null })); }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked, errors.termsAccepted && styles.checkboxError]}>
                    {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.consentText, errors.termsAccepted && styles.consentTextError]}>
                    I accept the{' '}
                    <Text style={styles.consentLink} onPress={() => Linking.openURL('https://tobeatraveller.com/terms')}>Terms</Text>
                    {' '}and{' '}
                    <Text style={styles.consentLink} onPress={() => Linking.openURL('https://tobeatraveller.com/privacy-policy')}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>
                {errors.termsAccepted ? <Text style={styles.consentError}>{errors.termsAccepted}</Text> : null}
              </View>

              {authError && Object.keys(errors).length === 0 && (
                <Text style={styles.authError}>{authError}</Text>
              )}

              <TouchableOpacity
                style={[styles.btn, (loading || usernameStatus === 'taken') && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading || usernameStatus === 'taken'}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{loading ? 'Creating account…' : 'Create account'}</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                <Text style={styles.link}>
                  Already have an account? <Text style={styles.linkAccent}>Sign in</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('Tabs')} activeOpacity={0.7}>
                <Text style={styles.browse}>Explore without an account →</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const Field = ({ label, error, right, ...inputProps }) => (
  <View style={fieldStyles.wrapper}>
    <Text style={fieldStyles.label}>{label}</Text>
    <View style={[fieldStyles.row, error && fieldStyles.rowError]}>
      <TextInput style={fieldStyles.input} placeholderTextColor="#9ca3af" {...inputProps} />
      {right}
    </View>
    {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#001a33' },
  kav: { flex: 1 },

  branding: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 28,
    justifyContent: 'flex-end',
  },
  brandIcon: { fontSize: 30, marginBottom: 8 },
  brandName: {
    fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginBottom: 14,
    ...textShadow(1, 0.3, 4),
  },
  tagline: {
    fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 34, letterSpacing: -0.5,
    ...textShadow(1, 0.25, 4),
  },

  sheetOuter: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: '#fff',
    ...shadow(-8, 0.15, 24, 20),
  },
  sheetInner: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  sheetContent: { paddingHorizontal: 24 },

  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },

  consentBox: { gap: 8, marginBottom: 4 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#9ca3af',
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#0077b6', borderColor: '#0077b6' },
  checkboxError: { borderColor: '#dc2626', borderWidth: 2 },
  consentTextError: { color: '#dc2626' },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  consentText: { fontSize: 12, color: '#6b7280', lineHeight: 18, flex: 1 },
  consentBold: { fontWeight: '600', color: '#374151' },
  consentLink: { color: '#0077b6', fontWeight: '500' },
  required: { color: '#dc2626', fontWeight: '700' },
  consentError: { fontSize: 11, color: '#dc2626', marginLeft: 28 },
  authError: { color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 4 },

  btn: {
    backgroundColor: '#0077b6', borderRadius: 999,
    paddingVertical: 15, alignItems: 'center', marginTop: 8, marginBottom: 10,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },

  link: { textAlign: 'center', color: '#6b7280', fontSize: 14, marginBottom: 10 },
  linkAccent: { color: '#0077b6', fontWeight: '600' },
  browse: { textAlign: 'center', color: '#9ca3af', fontSize: 13 },

  usernamePill: {
    alignSelf: 'flex-end', borderRadius: 999,
    paddingVertical: 3, paddingHorizontal: 10, marginTop: 4, marginBottom: 4,
  },
  pill_checking: { backgroundColor: '#f1f5f9' },
  pill_available: { backgroundColor: '#f0fdf4' },
  pill_taken: { backgroundColor: '#fef2f2' },
  usernameText: { fontSize: 12, fontWeight: '600' },
  pillText_checking: { color: '#6b7280' },
  pillText_available: { color: '#16a34a' },
  pillText_taken: { color: '#dc2626' },

  eyeBtn: { paddingHorizontal: 12 },
  eyeIcon: { fontSize: 16 },
});

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 5 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#dde3ec',
    borderRadius: 10, backgroundColor: '#f7f9fc',
  },
  rowError: { borderColor: '#dc2626' },
  input: { flex: 1, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: '#111827' },
  error: { fontSize: 12, color: '#dc2626', marginTop: 4 },
});

export default RegisterScreen;
