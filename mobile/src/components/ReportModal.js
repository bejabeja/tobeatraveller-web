import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS, reportDetailsError, submitReport } from '@tobeatraveller/shared';
import { COLORS, shadow } from '../utils/styles';

// Reports a comment, a trip or a profile. The team reads it; the reported
// person is never told who sent it.
const ReportModal = ({ targetType, targetId, onClose }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const detailsError = reason ? reportDetailsError({ reason, details }) : null;
  const isIllegal = reason === REPORT_REASONS.ILLEGAL;

  const send = async () => {
    setSending(true);
    try {
      await submitReport({ targetType, targetId, reason, details });
      Alert.alert(t('report.button'), t('report.sent'));
      onClose();
    } catch (error) {
      Alert.alert(t('errors.somethingWrong'), error.message || t('report.sendError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">{t(`report.title.${targetType}`)}</Text>
            <TouchableOpacity onPress={onClose} disabled={sending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.intro}>{t('report.intro')}</Text>
            <Text style={styles.label}>{t('report.reasonLabel')}</Text>
            {Object.values(REPORT_REASONS).map((value) => {
              const selected = reason === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => setReason(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? COLORS.primary : '#9ca3af'} />
                  <Text style={styles.optionText}>{t(`report.reason.${value}`)}</Text>
                </TouchableOpacity>
              );
            })}
            {!!reason && (
              <>
                <Text style={styles.label}>{t(isIllegal ? 'report.detailsLabelIllegal' : 'report.detailsLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={details}
                  onChangeText={setDetails}
                  maxLength={REPORT_DETAILS_MAX_LENGTH}
                  placeholder={t('report.detailsPlaceholder')}
                  multiline
                  accessibilityLabel={t(isIllegal ? 'report.detailsLabelIllegal' : 'report.detailsLabel')}
                />
                {isIllegal && !!detailsError && <Text style={styles.hint} accessibilityRole="alert">{t(detailsError)}</Text>}
              </>
            )}
            <TouchableOpacity
              style={[styles.submit, (!reason || !!detailsError || sending) && styles.submitDisabled]}
              onPress={send}
              disabled={!reason || !!detailsError || sending}
              accessibilityRole="button"
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('report.submit')}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: {
    maxHeight: '90%', backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    ...shadow(-4, 0.12, 16, 8),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  body: { padding: 16, gap: 8, paddingBottom: 32 },
  intro: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  label: { marginTop: 8, fontSize: 14, fontWeight: '700', color: '#111827' },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: '#fff5ef' },
  optionText: { flex: 1, fontSize: 15, color: '#111827' },
  input: {
    minHeight: 90, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
    fontSize: 15, color: '#111827', textAlignVertical: 'top',
  },
  hint: { fontSize: 13, color: '#6b7280' },
  submit: {
    marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 999,
    paddingVertical: 14, alignItems: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default ReportModal;
