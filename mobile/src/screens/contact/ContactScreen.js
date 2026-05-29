import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectMe, selectAuthUser, sendContact } from '@tobeatraveller/shared';
import { shadow } from '../../utils/styles';

const ContactScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const me = meDetail ?? authUser;

  const [fields, setFields] = useState({
    name: me?.name || me?.username || '',
    email: me?.email || '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key, value) => {
    setFields(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!fields.name.trim())    e.name    = 'Required';
    if (!fields.email.trim() || !/\S+@\S+\.\S+/.test(fields.email)) e.email = 'Valid email required';
    if (!fields.subject.trim()) e.subject = 'Required';
    if (fields.message.trim().length < 10) e.message = 'At least 10 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await sendContact(fields);
      setSent(true);
    } catch {
      Alert.alert('Error', 'Could not send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Get in touch</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.successTitle}>Message sent!</Text>
            <Text style={styles.successSub}>
              Thanks for reaching out. We'll get back to you as soon as possible.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
              <Text style={styles.btnText}>Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>
              We'd love to hear from you — feedback, questions, or just to say hello.
            </Text>

            <View style={styles.card}>
              <Field label="Your name" error={errors.name}>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={fields.name}
                  onChangeText={v => set('name', v)}
                  placeholder="Jane Doe"
                  placeholderTextColor="#9ca3af"
                  autoComplete="name"
                />
              </Field>

              <Field label="Your email" error={errors.email}>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={fields.email}
                  onChangeText={v => set('email', v)}
                  placeholder="jane@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </Field>

              <Field label="Subject" error={errors.subject}>
                <TextInput
                  style={[styles.input, errors.subject && styles.inputError]}
                  value={fields.subject}
                  onChangeText={v => set('subject', v)}
                  placeholder="What's on your mind?"
                  placeholderTextColor="#9ca3af"
                />
              </Field>

              <Field label="Message" error={errors.message}>
                <TextInput
                  style={[styles.input, styles.textarea, errors.message && styles.inputError]}
                  value={fields.message}
                  onChangeText={v => set('message', v)}
                  placeholder="Tell us more…"
                  placeholderTextColor="#9ca3af"
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
              </Field>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSend}
              disabled={loading}
            >
              <Text style={styles.btnText}>{loading ? 'Sending…' : 'Send message'}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const Field = ({ label, error, children }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {children}
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    ...shadow(2, 0.05, 6, 2),
  },
  back: { width: 40, padding: 4 },
  backText: { fontSize: 20, color: '#374151' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#111827' },

  scroll: { padding: 16, gap: 14 },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    ...shadow(2, 0.06, 8, 2),
  },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 11, paddingHorizontal: 13,
    fontSize: 15, color: '#111827',
  },
  textarea: { minHeight: 120 },
  inputError: { borderColor: '#dc2626' },
  errorText: { fontSize: 12, color: '#dc2626', marginTop: 4 },

  btn: {
    backgroundColor: '#0077b6', borderRadius: 999,
    paddingVertical: 15, alignItems: 'center',
    ...shadow(4, 0.2, 10, 4),
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { fontSize: 52, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21, marginBottom: 28 },
});

export default ContactScreen;
