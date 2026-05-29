import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { forgotPassword } from '@tobeatraveller/shared';

const ForgotPasswordScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError(t('errors.enterValidEmail'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      // Always show success — don't reveal if email exists
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.title}>{t('auth.checkInbox')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.resetLinkSent', { email })}{'\n'}
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.btnText}>{t('auth.backToSignIn')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.forgotPasswordSubtitle')}
            </Text>

            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                placeholder="your@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.btnText}>{loading ? t('common.sending') : t('auth.sendResetLink')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>{t('auth.backToSignIn')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, padding: 24 },

  back: { marginBottom: 32, alignSelf: 'flex-start', padding: 4 },
  backText: { fontSize: 22, color: '#374151' },

  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 21, marginBottom: 28 },

  fieldWrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 13, paddingHorizontal: 14,
    fontSize: 15, color: '#111827',
  },
  inputError: { borderColor: '#dc2626' },
  errorText: { fontSize: 12, color: '#dc2626', marginTop: 4 },

  btn: {
    backgroundColor: '#0077b6', borderRadius: 999,
    paddingVertical: 15, alignItems: 'center', marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  link: { textAlign: 'center', fontSize: 14, color: '#0077b6', fontWeight: '500' },

  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  successIcon: { fontSize: 48, marginBottom: 16 },
  emailHighlight: { fontWeight: '600', color: '#111827' },
});

export default ForgotPasswordScreen;
