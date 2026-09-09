import { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  createVanLogEntry, updateVanLogEntry, vanLogCategories, vanLogCategoryEmoji as CATEGORY_EMOJI,
  vanLogEntrySchema,
} from '@tobeatraveller/shared';
import { shadow } from '../../utils/styles';
import { GEOAPIFY_KEY } from '../../utils/config';

const today = () => new Date().toISOString().split('T')[0];

// The API returns location with flat lat/lon; the form works with nested coordinates internally.
const normalizeLocation = (location) => location?.name
  ? { name: location.name, country: location.country || '', label: location.label || location.name,
      coordinates: { lat: Number(location.lat) || 0, lon: Number(location.lon) || 0 } }
  : null;

const VanLogEntryFormScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const entry = route.params?.entry ?? null;
  const isEditing = !!entry;

  const [category, setCategory] = useState(entry?.category ?? 'fuel');
  const [title, setTitle] = useState(entry?.title ?? '');
  const [amount, setAmount] = useState(entry?.amount != null ? String(entry.amount) : '');
  const [currency, setCurrency] = useState(entry?.currency ?? 'EUR');
  const [pricePerLiter, setPricePerLiter] = useState(entry?.pricePerLiter != null ? String(entry.pricePerLiter) : '');
  const [entryDate, setEntryDate] = useState(entry?.entryDate ? entry.entryDate.slice(0, 10) : today());
  const [location, setLocation] = useState(() => normalizeLocation(entry?.location));
  const [locationQuery, setLocationQuery] = useState(entry?.location?.name ?? '');
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const searchTimer = useRef(null);

  const handleBack = () => {
    if (!isDirty) { navigation.goBack(); return; }
    Alert.alert(t('editProfile.discardChanges'), t('editProfile.discardChangesDesc'), [
      { text: t('editProfile.keepEditing'), style: 'cancel' },
      { text: t('editProfile.discard'), style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const searchLocation = (text) => {
    setLocationQuery(text);
    setIsDirty(true);
    if (location && text !== location.name) setLocation(null);
    if (!text || text.length < 2) { setLocationResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      if (!GEOAPIFY_KEY) return;
      setLocationSearching(true);
      try {
        const params = new URLSearchParams({ text, apiKey: GEOAPIFY_KEY, limit: 5, lang: 'en' });
        const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`);
        const data = await res.json();
        setLocationResults((data.features ?? []).map(f => {
          const p = f.properties;
          return {
            name: p.city ?? p.county ?? p.state ?? p.country ?? p.name,
            country: p.country,
            label: p.formatted,
            coordinates: { lat: p.lat, lon: p.lon },
          };
        }));
      } catch { setLocationResults([]); }
      finally { setLocationSearching(false); }
    }, 400);
  };

  const selectLocation = (loc) => {
    setLocation(loc);
    setLocationQuery(loc.name);
    setLocationResults([]);
  };

  const clearLocation = () => {
    setLocation(null);
    setLocationQuery('');
    setLocationResults([]);
    setIsDirty(true);
  };

  const handleSave = async () => {
    const parsed = vanLogEntrySchema.safeParse({
      category,
      title,
      amount,
      currency,
      pricePerLiter: category === 'fuel' ? pricePerLiter : '',
      entryDate,
      location: location
        ? { name: location.name, country: location.country, label: location.label, coordinates: location.coordinates }
        : undefined,
      notes,
    });
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
      category: data.category,
      title: data.title || null,
      amount: data.amount,
      currency: data.currency || null,
      pricePerLiter: data.pricePerLiter,
      location: location
        ? {
            name: location.name,
            country: location.country || null,
            label: location.label || location.name,
            lat: location.coordinates?.lat ?? null,
            lon: location.coordinates?.lon ?? null,
          }
        : null,
      notes: data.notes || null,
      entryDate: data.entryDate,
    };
    try {
      if (isEditing) await updateVanLogEntry(entry.id, payload);
      else await createVanLogEntry(payload);
      navigation.goBack();
    } catch (err) {
      setSubmitError(err?.message || t('vanLog.saveError'));
    } finally {
      setSaving(false);
    }
  };

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
        <Text style={styles.headerTitle}>{isEditing ? t('vanLog.editEntry') : t('vanLog.addEntry')}</Text>
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
            <Field label={t('vanLog.categoryLabel')} error={errors.category}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {vanLogCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.chip, category === cat.value && styles.chipActive]}
                    onPress={() => { setCategory(cat.value); setErrors(e => ({ ...e, category: null })); setIsDirty(true); }}
                  >
                    <Text style={styles.chipEmoji}>{CATEGORY_EMOJI[cat.value] ?? '📍'}</Text>
                    <Text style={[styles.chipLabel, category === cat.value && styles.chipLabelActive]}>
                      {t(`vanLog.category.${cat.value}`, cat.label)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Field>

            <Field label={t('vanLog.titleLabel')} error={errors.title}>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={v => { setTitle(v); setErrors(e => ({ ...e, title: null })); setIsDirty(true); }}
                placeholder={t('vanLog.titlePlaceholder')}
                placeholderTextColor="#9ca3af"
                maxLength={255}
              />
            </Field>

            <View style={styles.row}>
              <Field label={t('vanLog.amountLabel')} error={errors.amount} style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={v => { setAmount(v); setErrors(e => ({ ...e, amount: null })); setIsDirty(true); }}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </Field>
              <View style={{ width: 12 }} />
              <Field label={t('vanLog.currencyLabel')} error={errors.currency} style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  value={currency}
                  onChangeText={v => { setCurrency(v); setErrors(e => ({ ...e, currency: null })); setIsDirty(true); }}
                  autoCapitalize="characters"
                  maxLength={3}
                />
              </Field>
            </View>

            {category === 'fuel' && (
              <Field label={t('vanLog.pricePerLiterLabel')} error={errors.pricePerLiter}>
                <TextInput
                  style={styles.input}
                  value={pricePerLiter}
                  onChangeText={v => { setPricePerLiter(v); setErrors(e => ({ ...e, pricePerLiter: null })); setIsDirty(true); }}
                  placeholder="0.000"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </Field>
            )}

            <Field label={t('vanLog.dateLabel')} error={errors.entryDate}>
              <TextInput
                style={styles.input}
                value={entryDate}
                onChangeText={v => { setEntryDate(v); setErrors(e => ({ ...e, entryDate: null })); setIsDirty(true); }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                keyboardType="numbers-and-punctuation"
              />
            </Field>

            <Field label={t('vanLog.locationLabel')} error={errors.location}>
              <View style={styles.locationInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }, location && styles.inputConfirmed]}
                  value={locationQuery}
                  onChangeText={searchLocation}
                  placeholder={t('vanLog.locationPlaceholder')}
                  placeholderTextColor="#9ca3af"
                />
                {locationSearching && <ActivityIndicator size="small" color="#E8743B" style={styles.locationSpinner} />}
                {!locationSearching && locationQuery.length > 0 && (
                  <TouchableOpacity onPress={clearLocation} style={styles.locationClear}>
                    <Text style={styles.locationClearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {locationResults.length > 0 && (
                <View style={styles.locationResults}>
                  {locationResults.map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.locationResult, i < locationResults.length - 1 && styles.locationResultBorder]}
                      onPress={() => selectLocation(r)}
                    >
                      <Text style={styles.locationResultName}>{r.name}</Text>
                      <Text style={styles.locationResultLabel} numberOfLines={1}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>

            <Field label={t('vanLog.notesLabel')} error={errors.notes} hint={`${notes.length}/1000`} hintWarn={notes.length > 900}>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={notes}
                onChangeText={v => { setNotes(v); setErrors(e => ({ ...e, notes: null })); setIsDirty(true); }}
                multiline
                maxLength={1000}
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

  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 11, paddingHorizontal: 13,
    fontSize: 15, color: '#111827',
  },
  inputConfirmed: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  textarea: { minHeight: 90, textAlignVertical: 'top' },

  locationInputRow: { flexDirection: 'row', alignItems: 'center' },
  locationSpinner: { position: 'absolute', right: 12 },
  locationClear: { position: 'absolute', right: 10, padding: 4 },
  locationClearText: { color: '#9ca3af', fontSize: 13 },
  locationResults: {
    marginTop: 6, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    backgroundColor: '#fff', overflow: 'hidden',
  },
  locationResult: { paddingVertical: 10, paddingHorizontal: 12 },
  locationResultBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  locationResultName: { fontSize: 14, color: '#111827', fontWeight: '600' },
  locationResultLabel: { fontSize: 12, color: '#9ca3af', marginTop: 1 },

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

export default VanLogEntryFormScreen;
