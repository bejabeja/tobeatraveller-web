import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  addInventoryItem, addShoppingListItem, isNetworkError, supplyCategories, supplyItemSchema, supplyUnits,
  updateInventoryItem, updateShoppingListItem,
} from '@tobeatraveller/shared';
import { shadow } from '../../utils/styles';

const CATEGORY_EMOJI = { food: '🍎', hygiene: '🧴', cleaning: '🧽', vehicle: '🚗', other: '📦' };
const MAX_SUGGESTIONS = 5;

const SupplyFormScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const s = (key, vars) => t(`supplies.${key}`, vars);
  const insets = useSafeAreaInsets();
  const { listType, item = null, existingItems = [] } = route.params ?? {};
  const isEditing = !!item;

  const [name, setName] = useState(item?.name ?? '');
  const [suggestions, setSuggestions] = useState([]);
  const [category, setCategory] = useState(item?.category ?? 'food');
  const [amount, setAmount] = useState(item?.amount != null ? String(item.amount) : '');
  const [unit, setUnit] = useState(item?.unit ?? 'units');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const handleBack = () => {
    if (!isDirty) { navigation.goBack(); return; }
    Alert.alert(t('editProfile.discardChanges'), t('editProfile.discardChangesDesc'), [
      { text: t('editProfile.keepEditing'), style: 'cancel' },
      { text: t('editProfile.discard'), style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const handleNameChange = (value) => {
    setName(value);
    setErrors(e => ({ ...e, name: null }));
    setIsDirty(true);
    if (!value.trim()) { setSuggestions([]); return; }
    const query = value.trim().toLowerCase();
    const matches = existingItems.filter(existing =>
      existing.name.toLowerCase().includes(query) && existing.name.toLowerCase() !== query
    ).slice(0, MAX_SUGGESTIONS);
    setSuggestions(matches);
  };

  const selectSuggestion = (suggestion) => {
    setName(suggestion.name);
    setUnit(suggestion.unit);
    setCategory(suggestion.category);
    setSuggestions([]);
  };

  const handleSave = async () => {
    const parsed = supplyItemSchema.safeParse({ name, category, amount, unit, notes });
    if (!parsed.success) {
      const fieldErrors = {};
      parsed.error.errors.forEach(e => { fieldErrors[e.path[0]] = e.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSaving(true);
    const data = parsed.data;
    const payload = {
      name: data.name.trim(),
      category: data.category,
      amount: data.amount,
      unit: data.unit,
      notes: data.notes || null,
    };
    try {
      if (isEditing) {
        if (listType === 'shopping') await updateShoppingListItem(item.id, payload);
        else await updateInventoryItem(item.id, payload);
      } else {
        if (listType === 'shopping') await addShoppingListItem(payload);
        else await addInventoryItem(payload);
      }
      navigation.goBack();
    } catch (err) {
      setSubmitError(isNetworkError(err) ? t('errors.networkError') : (err?.message || s('saveError')));
    } finally {
      setSaving(false);
    }
  };

  const allowsDecimals = supplyUnits.find(u => u.value === unit)?.allowsDecimals ?? true;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? s('editItem') : s('addItem')}</Text>
        <TouchableOpacity
          style={[styles.headerSave, saving && styles.headerSaveDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.headerSaveText}>{saving ? t('common.saving') : t('common.save')}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Field label={s('nameLabel')} error={errors.name}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={handleNameChange}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                placeholder={s('namePlaceholder')}
                placeholderTextColor="#9ca3af"
                maxLength={255}
              />
              {suggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {suggestions.map((sug, i) => (
                    <TouchableOpacity
                      key={`${sug.name}-${sug.unit}`}
                      style={[styles.suggestion, i < suggestions.length - 1 && styles.suggestionBorder]}
                      onPress={() => selectSuggestion(sug)}
                    >
                      <Text style={styles.suggestionName}>{sug.name}</Text>
                      <Text style={styles.suggestionUnit}> · {s(`unit.${sug.unit}`, sug.unit)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>

            <Field label={s('categoryLabel')} error={errors.category}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {supplyCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.chip, category === cat.value && styles.chipActive]}
                    onPress={() => { setCategory(cat.value); setErrors(e => ({ ...e, category: null })); setIsDirty(true); }}
                  >
                    <Text style={styles.chipEmoji}>{CATEGORY_EMOJI[cat.value] ?? '📦'}</Text>
                    <Text style={[styles.chipLabel, category === cat.value && styles.chipLabelActive]}>
                      {s(`category.${cat.value}`, cat.label)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Field>

            <View style={styles.row}>
              <Field label={s('amountLabel')} error={errors.amount} style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={v => { setAmount(v); setErrors(e => ({ ...e, amount: null })); setIsDirty(true); }}
                  placeholder={allowsDecimals ? '0.00' : '0'}
                  placeholderTextColor="#9ca3af"
                  keyboardType={allowsDecimals ? 'decimal-pad' : 'number-pad'}
                />
              </Field>
            </View>

            <Field label={s('unitLabel')} error={errors.unit}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {supplyUnits.map(u => (
                  <TouchableOpacity
                    key={u.value}
                    style={[styles.chip, unit === u.value && styles.chipActive]}
                    onPress={() => { setUnit(u.value); setErrors(e => ({ ...e, unit: null })); setIsDirty(true); }}
                  >
                    <Text style={[styles.chipLabel, unit === u.value && styles.chipLabelActive]}>
                      {s(`unit.${u.value}`, u.label)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Field>

            <Field label={s('notesLabel')} error={errors.notes} hint={`${notes.length}/500`} hintWarn={notes.length > 450}>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={notes}
                onChangeText={v => { setNotes(v); setErrors(e => ({ ...e, notes: null })); setIsDirty(true); }}
                multiline
                maxLength={500}
              />
            </Field>
          </View>

          {submitError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const Field = ({ label, error, hint, hintWarn, style, children }) => (
  <View style={[fieldStyles.wrapper, style]}>
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
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 16,
  },
  headerSaveDisabled: { opacity: 0.5 },
  headerSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scroll: { padding: 16, gap: 14 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    ...shadow(2, 0.06, 8, 2),
  },

  row: { flexDirection: 'row' },

  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 11, paddingHorizontal: 13,
    fontSize: 15, color: '#111827',
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  suggestions: {
    marginTop: 6, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    backgroundColor: '#fff', overflow: 'hidden',
  },
  suggestion: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 10, paddingHorizontal: 12 },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  suggestionName: { fontSize: 14, color: '#111827', fontWeight: '600' },
  suggestionUnit: { fontSize: 12, color: '#9ca3af' },

  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipActive: { borderColor: '#E8743B', backgroundColor: '#FFF0E8' },
  chipEmoji: { fontSize: 13 },
  chipLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  chipLabelActive: { color: '#E8743B', fontWeight: '600' },

  errorBanner: {
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#fecaca',
  },
  errorBannerText: { color: '#dc2626', fontSize: 14 },
});

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 12, color: '#9ca3af' },
  hintWarn: { color: '#f59e0b' },
  error: { fontSize: 12, color: '#dc2626', marginTop: 4 },
});

export default SupplyFormScreen;
