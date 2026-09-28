import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { experienceDates, formatTripDates, isCalendarDay, localCalendarDay } from '@tobeatraveller/shared';
import { COLORS } from '../utils/styles';
import DateField from './DateField';

const CALENDAR_DAY_LENGTH = 'YYYY-MM-DD'.length;

// When an experience starts, if its traveller knows: it can be left empty
// and the experience is planned by its days alone. Only the web build types
// the day, so only there can it be one that doesn't exist.
const ExperienceStartDate = ({ value, days, onChange }) => {
  const { t, i18n } = useTranslation();
  const ce = (key) => t(`createExperience.${key}`);
  const valid = isCalendarDay(value);
  // From today on, unless it's being edited and already started earlier.
  const today = localCalendarDay();
  const earliestDay = valid && value < today ? value : today;
  const invalid = value.length >= CALENDAR_DAY_LENGTH && !valid;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{ce('whenLeaving')}</Text>
      <Text style={styles.hint}>{ce('whenLeavingHint')}</Text>
      <View style={styles.row}>
        <DateField
          style={[styles.input, invalid && styles.inputError]}
          value={value}
          onChange={onChange}
          minimumDate={earliestDay}
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
