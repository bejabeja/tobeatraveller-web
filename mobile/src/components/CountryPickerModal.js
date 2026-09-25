import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { countryFlag, countryName, searchCountryCodes, updateMyDeclaredCountries } from '@tobeatraveller/shared';

// The owner picks the countries they have been to without a trip or entry
// behind them. `lockedCodes` are already earned through activity: shown as
// marked, but not something to add or remove here.
const CountryPickerModal = ({ visible, onClose, onSaved, initialSelected = [], lockedCodes = [] }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const [saving, setSaving] = useState(false);
  const locked = useMemo(() => new Set(lockedCodes), [lockedCodes]);
  const codes = useMemo(() => searchCountryCodes(query, i18n.language), [query, i18n.language]);

  // Each opening starts from what is saved, not from an unsaved earlier edit.
  useEffect(() => {
    if (!visible) return;
    setSelected(new Set(initialSelected));
    setQuery('');
    // Only on opening: initialSelected is a new array on every parent render.
  }, [visible]);

  const toggle = (code) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelected(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateMyDeclaredCountries([...selected]);
      onSaved();
    } catch {
      Alert.alert(t('passport.pickerSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const markedCount = new Set([...selected, ...locked]).size;

  const renderCountry = ({ item: code }) => {
    const isLocked = locked.has(code);
    const isChecked = isLocked || selected.has(code);
    return (
      <TouchableOpacity
        style={[styles.row, isChecked && styles.rowChecked]}
        onPress={() => toggle(code)}
        disabled={isLocked}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked, disabled: isLocked }}
        accessibilityLabel={countryName(code, i18n.language)}
      >
        <Text style={styles.flag}>{countryFlag(code)}</Text>
        <Text style={styles.name} numberOfLines={1}>{countryName(code, i18n.language)}</Text>
        {isLocked
          ? <Text style={styles.earned}>{t('passport.pickerEarned')}</Text>
          : <Ionicons name={isChecked ? 'checkbox' : 'square-outline'} size={22} color={isChecked ? '#E8743B' : '#9ca3af'} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Keeps the save button above the keyboard while searching. */}
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={t('common.cancel')}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{t('passport.pickerTitle')}</Text>
        </View>

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder={t('passport.pickerSearch')}
          accessibilityLabel={t('passport.pickerSearch')}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <Text style={styles.count} accessibilityLiveRegion="polite">{t('passport.pickerSelected', { count: markedCount })}</Text>

        <FlatList
          data={codes}
          keyExtractor={code => code}
          renderItem={renderCountry}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t('passport.pickerNoResults')}</Text>}
        />

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('passport.pickerSave')}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' },
  search: {
    margin: 16, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', fontSize: 15,
  },
  count: { marginHorizontal: 16, marginBottom: 6, fontSize: 12, fontWeight: '600', color: '#6b7280' },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  rowChecked: { borderColor: '#d9a441', backgroundColor: '#fdf6e9' },
  flag: { fontSize: 22 },
  name: { flex: 1, fontSize: 15, color: '#111827' },
  earned: { fontSize: 11, color: '#6b7280' },
  empty: { marginTop: 24, textAlign: 'center', color: '#6b7280' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff' },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#E8743B' },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default CountryPickerModal;
