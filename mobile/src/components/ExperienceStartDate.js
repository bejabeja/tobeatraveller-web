import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { experienceDates, formatTripDates, isCalendarDay } from '@tobeatraveller/shared';
import { COLORS } from '../utils/styles';

const CALENDAR_DAY_LENGTH = 'YYYY-MM-DD'.length;

// When an experience starts, if its traveller knows: it can be left empty
// and the experience is planned by its days alone. The date is typed like
// the trip form's ones.
const ExperienceStartDate = ({ value, days, onChange }) => {
  const { t, i18n } = useTranslation();
  const ce = (key) => t(`createExperience.${key}`);
  const valid = isCalendarDay(value);
  const invalid = value.length >= CALENDAR_DAY_LENGTH && !valid;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{ce('whenLeaving')}</Text>
      <Text style={styles.hint}>{ce('whenLeavingHint')}</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, invalid && styles.inputError]}
          value={value}
          onChangeText={onChange}
          placeholder={t('common.datePlaceholder')}
          placeholderTextColor="#9ca3af"
          keyboardType="numbers-and-punctuation"
          maxLength={CALENDAR_DAY_LENGTH}
          accessibilityLabel={ce('whenLeaving')}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button">
            <Text style={styles.clear}>{ce('notSureYet')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {invalid && <Text style={styles.error}>{ce('invalidDate')}</Text>}
      {valid && (
        <Text style={styles.range}>📅 {formatTripDates(value, experienceDates(value, days).endDate, i18n.language)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 8 },
  label: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  hint: { fontSize: 12, color: COLORS.textSub, marginTop: -4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    minWidth: 150, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 11, paddingHorizontal: 14, fontSize: 15, color: COLORS.text,
  },
  inputError: { borderColor: '#dc2626' },
  clear: { fontSize: 13, fontWeight: '600', color: COLORS.accent, textDecorationLine: 'underline' },
  error: { fontSize: 12, color: '#dc2626' },
  range: { fontSize: 13, fontWeight: '600', color: COLORS.accent },
});

export default ExperienceStartDate;
