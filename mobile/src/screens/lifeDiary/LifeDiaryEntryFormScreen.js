import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  createLifeDiaryEntry, isNetworkError, lifeDiaryEntrySchema, reverseGeocode, searchDestinations,
  updateLifeDiaryEntry,
} from '@tobeatraveller/shared';
import { shadow } from '../../utils/styles';
import { GEOAPIFY_KEY } from '../../utils/config';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { UseCurrentLocationButton } from '../../components/UseCurrentLocationButton';
import { newEntityId, runOrQueue } from '../../offline/outbox';
import { CHANGE_KINDS, COLLECTIONS } from '../../offline/pendingChanges';

const MAX_GALLERY_IMAGES = 6;
const today = () => new Date().toISOString().split('T')[0];

// The API returns location with flat lat/lon; the form works with nested coordinates internally.
const normalizeLocation = (location) => location?.name
  ? { name: location.name, country: location.country || '', label: location.label || location.name,
      coordinates: { lat: Number(location.lat) || 0, lon: Number(location.lon) || 0 } }
  : null;

const LifeDiaryEntryFormScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const d = (key, vars) => t(`lifeDiary.${key}`, vars);
  const insets = useSafeAreaInsets();
  const entry = route.params?.entry ?? null;
  const isEditing = !!entry;

  const [entryDate, setEntryDate] = useState(entry?.entryDate ? entry.entryDate.slice(0, 10) : today());
  const [location, setLocation] = useState(() => normalizeLocation(entry?.location));
  const [locationQuery, setLocationQuery] = useState(entry?.location?.name ?? '');
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [bestMoment, setBestMoment] = useState(entry?.bestMoment ?? '');
  const [lessonLearned, setLessonLearned] = useState(entry?.lessonLearned ?? '');
  const [existingImages, setExistingImages] = useState(entry?.images ?? []);
  const [newPhotos, setNewPhotos] = useState([]);
  const [memories, setMemories] = useState(entry?.memories ?? '');
  const [peopleMet, setPeopleMet] = useState(entry?.peopleMet ?? '');
  const [wouldReturn, setWouldReturn] = useState(entry?.wouldReturn ?? null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const searchTimer = useRef(null);
  const { getCurrentLocation, getLocationIfPermitted, loading: locating } = useCurrentLocation();

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
        const bias = await getLocationIfPermitted();
        setLocationResults(await searchDestinations(text, { apiKey: GEOAPIFY_KEY, bias }));
      } catch { setLocationResults([]); }
      finally { setLocationSearching(false); }
    }, 400);
  };

  const selectLocation = (loc) => {
    setLocation(loc);
    setLocationQuery(loc.name);
    setLocationResults([]);
    setIsDirty(true);
  };

  const clearLocation = () => {
    setLocation(null);
    setLocationQuery('');
    setLocationResults([]);
    setIsDirty(true);
  };

  const handleUseCurrentLocation = async () => {
    let coords;
    try {
      coords = await getCurrentLocation();
    } catch {
      Alert.alert(t('common.locationPermissionDeniedToast'));
      return;
    }
    try {
      const place = await reverseGeocode({ ...coords, apiKey: GEOAPIFY_KEY });
      if (place) selectLocation(place);
      else Alert.alert(t('common.locationErrorToast'));
    } catch {
      Alert.alert(t('common.locationErrorToast'));
    }
  };

  const totalPhotoCount = existingImages.length + newPhotos.length;

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('editProfile.permissionNeeded'), t('editProfile.permissionNeededDesc'));
      return;
    }
    const remaining = MAX_GALLERY_IMAGES - totalPhotoCount;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const picked = result.assets.slice(0, remaining).map(asset => {
      const filename = asset.uri.split('/').pop();
      const ext = filename.split('.').pop().toLowerCase();
      return { uri: asset.uri, name: filename, type: ext === 'png' ? 'image/png' : 'image/jpeg' };
    });
    setNewPhotos(prev => [...prev, ...picked]);
    setIsDirty(true);
  };

  const removeExistingImage = (id) => {
    setExistingImages(prev => prev.filter(img => img.id !== id));
    setIsDirty(true);
  };

  const removeNewPhoto = (uri) => {
    setNewPhotos(prev => prev.filter(p => p.uri !== uri));
    setIsDirty(true);
  };

  // Photos can't wait in the offline queue: the picker's files may be gone
  // by the time the connection is back. So an entry with new photos is only
  // saved online, straight to the API.
  const saveWithNewPhotos = async (payload) => {
    // Going straight to the API would jump ahead of this entry's queued
    // changes (or target an entry the server doesn't have yet).
    if (entry?._pending) throw new Error(d('photosAfterSync'));
    const formData = new FormData();
    formData.append('entry', JSON.stringify(isEditing ? payload : { ...payload, id: newEntityId() }));
    newPhotos.forEach(photo => formData.append('images', photo));
    if (isEditing) await updateLifeDiaryEntry(entry.id, formData);
    else await createLifeDiaryEntry(formData);
  };

  const handleSave = async () => {
    const parsed = lifeDiaryEntrySchema.safeParse({
      entryDate,
      location: location
        ? { name: location.name, country: location.country, label: location.label, coordinates: location.coordinates }
        : undefined,
      bestMoment,
      lessonLearned,
      memories,
      peopleMet,
      wouldReturn,
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
      entryDate: data.entryDate,
      location: location
        ? {
            name: location.name,
            country: location.country || null,
            label: location.label || location.name,
            lat: location.coordinates?.lat ?? null,
            lon: location.coordinates?.lon ?? null,
          }
        : null,
      bestMoment: data.bestMoment || null,
      lessonLearned: data.lessonLearned || null,
      memories: data.memories || null,
      peopleMet: data.peopleMet || null,
      wouldReturn: data.wouldReturn,
      keepImageIds: existingImages.map(img => img.id),
    };
    try {
      if (newPhotos.length > 0) {
        await saveWithNewPhotos(payload);
      } else {
        const entityId = isEditing ? entry.id : newEntityId();
        await runOrQueue({
          collection: COLLECTIONS.LIFE_DIARY,
          kind: isEditing ? CHANGE_KINDS.UPDATE : CHANGE_KINDS.CREATE,
          entityId,
          payload: isEditing ? payload : { ...payload, id: entityId },
          label: payload.location?.name || payload.entryDate,
        });
      }
      navigation.goBack();
    } catch (err) {
      // Photos are the one thing that can't be saved offline (see saveWithNewPhotos).
      setSubmitError(isNetworkError(err) ? d('photosNeedConnection') : (err?.message || d('saveError')));
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
        <Text style={styles.headerTitle}>{isEditing ? d('editEntry') : d('addEntry')}</Text>
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
            <Field label={d('dateLabel')} error={errors.entryDate}>
              <TextInput
                style={styles.input}
                value={entryDate}
                onChangeText={v => { setEntryDate(v); setErrors(e => ({ ...e, entryDate: null })); setIsDirty(true); }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                keyboardType="numbers-and-punctuation"
              />
            </Field>

            <Field label={d('locationLabel')} error={errors.location}>
              <View style={styles.locationInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }, location && styles.inputConfirmed]}
                  value={locationQuery}
                  onChangeText={searchLocation}
                  placeholder={d('locationPlaceholder')}
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
              <UseCurrentLocationButton onPress={handleUseCurrentLocation} loading={locating} />
            </Field>

            <Field label={d('bestMomentLabel')} error={errors.bestMoment}>
              <TextInput
                style={styles.input}
                value={bestMoment}
                onChangeText={v => { setBestMoment(v); setErrors(e => ({ ...e, bestMoment: null })); setIsDirty(true); }}
                placeholder={d('bestMomentPlaceholder')}
                placeholderTextColor="#9ca3af"
                maxLength={500}
              />
            </Field>

            <Field label={d('lessonLearnedLabel')} error={errors.lessonLearned}>
              <TextInput
                style={styles.input}
                value={lessonLearned}
                onChangeText={v => { setLessonLearned(v); setErrors(e => ({ ...e, lessonLearned: null })); setIsDirty(true); }}
                placeholder={d('lessonLearnedPlaceholder')}
                placeholderTextColor="#9ca3af"
                maxLength={500}
              />
            </Field>

            <Field label={t('itineraryForm.galleryTitle')}>
              <View style={styles.gallery}>
                {existingImages.map(img => (
                  <View key={img.id} style={styles.photoWrapper}>
                    <Image source={{ uri: img.photoUrl }} style={styles.photo} resizeMode="cover" />
                    <TouchableOpacity style={styles.photoRemove} onPress={() => removeExistingImage(img.id)}>
                      <Ionicons name="close" size={13} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {newPhotos.map(photo => (
                  <View key={photo.uri} style={styles.photoWrapper}>
                    <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
                    <TouchableOpacity style={styles.photoRemove} onPress={() => removeNewPhoto(photo.uri)}>
                      <Ionicons name="close" size={13} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {totalPhotoCount < MAX_GALLERY_IMAGES && (
                  <TouchableOpacity style={styles.photoAdd} onPress={pickPhotos}>
                    <Ionicons name="add" size={22} color="#9ca3af" />
                    <Text style={styles.photoAddText}>{t('itineraryForm.addMorePhotos')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Field>

            <Field label={d('memoriesLabel')} error={errors.memories} hint={`${memories.length}/3000`} hintWarn={memories.length > 2700}>
              <TextInput
                style={[styles.input, styles.textareaLarge]}
                value={memories}
                onChangeText={v => { setMemories(v); setErrors(e => ({ ...e, memories: null })); setIsDirty(true); }}
                placeholder={d('memoriesPlaceholder')}
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={3000}
              />
            </Field>

            <Field label={d('peopleMetLabel')} error={errors.peopleMet}>
              <TextInput
                style={styles.input}
                value={peopleMet}
                onChangeText={v => { setPeopleMet(v); setErrors(e => ({ ...e, peopleMet: null })); setIsDirty(true); }}
                placeholder={d('peopleMetPlaceholder')}
                placeholderTextColor="#9ca3af"
                maxLength={500}
              />
            </Field>

            <Field label={d('wouldReturnLabel')}>
              <View style={styles.wouldReturnRow}>
                <TouchableOpacity
                  style={[styles.wouldReturnBtn, wouldReturn === true && styles.wouldReturnBtnActive]}
                  onPress={() => { setWouldReturn(true); setIsDirty(true); }}
                >
                  <Text style={[styles.wouldReturnText, wouldReturn === true && styles.wouldReturnTextActive]}>
                    {d('wouldReturnYes')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.wouldReturnBtn, wouldReturn === false && styles.wouldReturnBtnActive]}
                  onPress={() => { setWouldReturn(false); setIsDirty(true); }}
                >
                  <Text style={[styles.wouldReturnText, wouldReturn === false && styles.wouldReturnTextActive]}>
                    {d('wouldReturnNo')}
                  </Text>
                </TouchableOpacity>
              </View>
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

  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 11, paddingHorizontal: 13,
    fontSize: 15, color: '#111827',
  },
  inputConfirmed: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  textareaLarge: { minHeight: 120, textAlignVertical: 'top' },

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

  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrapper: { width: 76, height: 76, borderRadius: 10, overflow: 'visible' },
  photo: { width: 76, height: 76, borderRadius: 10, backgroundColor: '#f3f4f6' },
  photoRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
  },
  photoAdd: {
    width: 76, height: 76, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#dde3ec', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f9fc',
  },
  photoAddText: { fontSize: 9, color: '#9ca3af', marginTop: 2, textAlign: 'center' },

  wouldReturnRow: { flexDirection: 'row', gap: 8 },
  wouldReturnBtn: {
    flex: 1, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingVertical: 10, backgroundColor: '#f9fafb',
  },
  wouldReturnBtnActive: { borderColor: '#E8743B', backgroundColor: '#FFF0E8' },
  wouldReturnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  wouldReturnTextActive: { color: '#E8743B' },

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

export default LifeDiaryEntryFormScreen;
