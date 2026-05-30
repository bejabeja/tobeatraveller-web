import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Dimensions, ImageBackground, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginUser, selectAuthError } from '@tobeatraveller/shared';
import { shadow, textShadow } from '../../utils/styles';

const AUTH_BG = require('../../../assets/auth.webp');
const { height: SCREEN_H } = Dimensions.get('window');
const GUEST_EMAIL = 'test.tobeatraveller@gmail.com';
const GUEST_PASSWORD = 'testtest';

const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const authError = useSelector(selectAuthError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = t('errors.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t('errors.invalidEmailAddress');
    if (!password) e.password = t('errors.passwordRequired');
    else if (password.length < 6) e.password = t('errors.passwordMin');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await dispatch(loginUser({ email: email.trim(), password }));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      await dispatch(loginUser({ email: GUEST_EMAIL, password: GUEST_PASSWORD }));
    } finally {
      setGuestLoading(false);
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
          <Text style={styles.tagline}>{t('auth.taglineLogin')}</Text>
        </View>

        {/* Sheet — flex:0 sizes to content */}
        <View style={styles.sheetOuter}>
          <View style={styles.sheetInner}>
            <ScrollView
              style={{ maxHeight: SCREEN_H * 0.65 }}
              contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 8) + 20 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.handle} />
              <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
              <Text style={styles.subtitle}>{t('auth.signInSubtitle')}</Text>

              <Field
                label="Email"
                value={email}
                onChangeText={v => { setEmail(v); clearError('email'); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
              />

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

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => navigation.navigate('ForgotPassword')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>

              {authError && Object.keys(errors).length === 0 && (
                <Text style={styles.authError}>{authError}</Text>
              )}

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{loading ? t('auth.signingIn') : t('auth.signIn')}</Text>
              </TouchableOpacity>

              {__DEV__ && (
                <TouchableOpacity
                  style={[styles.guestBtn, guestLoading && styles.btnDisabled]}
                  onPress={handleGuest}
                  disabled={guestLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.guestBtnText}>{guestLoading ? t('common.loading') : t('auth.continueAsGuest')}</Text>
                </TouchableOpacity>
              )}

              <View style={styles.divider} />

              <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
                <Text style={styles.link}>
                  {t('auth.noAccount')} <Text style={styles.linkAccent}>{t('auth.createAccountLink')}</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('Tabs')} activeOpacity={0.7}>
                <Text style={styles.browse}>{t('auth.exploreWithout')}</Text>
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

  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 4, marginTop: 2, marginBottom: 4 },
  forgotText: { fontSize: 13, color: '#6b7280' },
  authError: { color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 4 },

  btn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 15, alignItems: 'center', marginTop: 8, marginBottom: 10,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  guestBtn: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1',
    borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginBottom: 4,
  },
  guestBtnText: { color: '#6b7280', fontSize: 14 },

  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },

  link: { textAlign: 'center', color: '#6b7280', fontSize: 14, marginBottom: 10 },
  linkAccent: { color: '#E8743B', fontWeight: '600' },
  browse: { textAlign: 'center', color: '#9ca3af', fontSize: 13 },

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

export default LoginScreen;
