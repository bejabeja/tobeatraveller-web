import { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { formatCalendarDay, localCalendarDay } from '@tobeatraveller/shared';
import { COLORS, shadow } from '../utils/styles';

// Short enough for two fields side by side (a trip's start and end).
const SHORT_DAY = { day: 'numeric', month: 'short', year: 'numeric' };

const dateOf = (day) => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
};

// A calendar day ("YYYY-MM-DD") chosen with the phone's own date picker.
// The picker doesn't exist on the web build, where the day is typed instead.
// `style` is the form's input style, so it looks like the fields around it.
const DateField = ({ value, onChange, style, minimumDate, accessibilityLabel }) => {
  const { t, i18n } = useTranslation();
  const [pickingOnIos, setPickingOnIos] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <TextInput
        style={style}
        value={value}
        onChangeText={onChange}
        placeholder={t('common.datePlaceholder')}
        placeholderTextColor="#9ca3af"
        keyboardType="numbers-and-punctuation"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  const shownDate = value ? dateOf(value) : new Date();
  const limits = minimumDate ? { minimumDate: dateOf(minimumDate) } : {};
  const choose = (_event, date) => onChange(localCalendarDay(date));

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: shownDate, mode: 'date', onValueChange: choose, ...limits });
    } else {
      setPickingOnIos(true);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={open} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
        <View pointerEvents="none" style={style}>
          <Text style={[styles.text, !value && styles.placeholder]} numberOfLines={1}>
            {value ? formatCalendarDay(value, i18n.language, SHORT_DAY) : t('common.pickDate')}
          </Text>
        </View>
      </TouchableOpacity>
      {pickingOnIos && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setPickingOnIos(false)}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <DateTimePicker
                value={shownDate}
                mode="date"
                display="inline"
                locale={i18n.language}
                accentColor={COLORS.primary}
                onValueChange={choose}
                {...limits}
              />
              <TouchableOpacity style={styles.done} onPress={() => setPickingOnIos(false)} accessibilityRole="button">
                <Text style={styles.doneText}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  text: { fontSize: 15, color: '#111827' },
  placeholder: { color: '#9ca3af' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 32,
    ...shadow(-4, 0.12, 16, 8),
  },
  done: {
    marginTop: 8, marginHorizontal: 8, backgroundColor: COLORS.primary, borderRadius: 999,
    paddingVertical: 14, alignItems: 'center',
  },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default DateField;
