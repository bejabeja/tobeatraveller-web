import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  createItinerary, selectAuthUser, selectMe,
  setUserInfo, setUserInfoItineraries,
} from '@tobeatraveller/shared';
import {
  BudgetSection, Card, CategorySection, DatesSection,
  Field, PlacesSection, TravellersSection, VisibilitySection, s,
} from './ItineraryFormShared';
import { shadow } from '../../utils/styles';
import { GEOAPIFY_KEY } from '../../utils/config';

const CreateItineraryScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const me = meDetail ?? authUser;

  const today = new Date().toISOString().split('T')[0];
  const [saving, setSaving] = useState(false);

  // Form state
  const [photoUri, setPhotoUri] = useState(null);
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState(null); // { name, label, coordinates: {lat,lon} }
  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState([]);
  const [destSearching, setDestSearching] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [travellers, setTravellers] = useState(1);
  const [isPublic, setIsPublic] = useState(false);
  const [places, setPlaces] = useState([]);
  const [days, setDays] = useState([1]);
  const [errors, setErrors] = useState({});

  const destTimer = useRef(null);

  const tripDays = (() => {
    if (!startDate || !endDate) return 1;
    return Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1);
  })();

  // Progress calculation (mirrors web: 5 sections)
  const isBasicComplete = title.length >= 2 && !!destination?.name;
  const isDatesComplete = !!(startDate && endDate);
  const isPhotoComplete = !!photoUri;
  const isPlacesComplete = places.length > 0 && places.every(p => !!p.name.trim());
  const isBudgetComplete = !!(parseFloat(budget) > 0 && currency);
  const sectionsComplete = [isBasicComplete, isDatesComplete, isPhotoComplete, isPlacesComplete, isBudgetComplete].filter(Boolean).length;
  const progress = Math.round((sectionsComplete / 5) * 100);

  const missingItems = [
    !isBasicComplete  && t('itinerary.basicInfo'),
    !isDatesComplete  && t('itinerary.dates'),
    !isPhotoComplete  && t('itinerary.coverPhoto'),
    !isPlacesComplete && t('itinerary.placesLabel'),
    !isBudgetComplete && t('itinerary.budgetLabel'),
  ].filter(Boolean);

  // Destination search
  const searchDestination = (text) => {
    setDestQuery(text);
    if (destination && text !== destination.name) setDestination(null);
    if (!text || text.length < 2) { setDestResults([]); return; }
    clearTimeout(destTimer.current);
    destTimer.current = setTimeout(async () => {
      if (!GEOAPIFY_KEY) return;
      setDestSearching(true);
      try {
        const params = new URLSearchParams({ text, apiKey: GEOAPIFY_KEY, limit: 5, lang: 'en' });
        const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`);
        const data = await res.json();
        setDestResults((data.features ?? []).map(f => {
          const p = f.properties;
          return {
            name: p.city ?? p.county ?? p.state ?? p.country ?? p.name,
            label: p.formatted,
            coordinates: { lat: p.lat, lon: p.lon },
          };
        }));
      } catch { setDestResults([]); }
      finally { setDestSearching(false); }
    }, 400);
  };

  const selectDestination = (dest) => {
    setDestination(dest);
    setDestQuery(dest.name);
    setDestResults([]);
    setErrors(e => ({ ...e, destination: null }));
  };

  const validate = () => {
    const e = {};
    if (!title.trim() || title.length < 2) e.title = t('createItinerary.titleMin');
    if (title.length > 50) e.title = t('createItinerary.titleMax');
    if (!destination?.name) e.destination = t('createItinerary.destinationRequired');
    if (description.length > 500) e.description = t('createItinerary.descriptionMax');
    if (!startDate) e.startDate = t('createItinerary.startDateRequired');
    if (!endDate) e.endDate = t('createItinerary.endDateRequired');
    if (startDate && endDate && endDate < startDate) e.endDate = t('createItinerary.endDateAfterStart');
    if (!budget || isNaN(parseFloat(budget))) e.budget = t('createItinerary.budgetRequired');
    if (!currency) e.currency = t('createItinerary.currencyRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (isPublic) {
      const emptyDays = days.filter(d => !places.some(p => p.dayNumber === d));
      if (emptyDays.length > 0) {
        Alert.alert(t('createItinerary.emptyDaysTitle'), t('createItinerary.emptyDaysDesc', { days: emptyDays.join(', ') }));
        return;
      }
    }
    setSaving(true);
    try {
      const body = {
        userId: me?.id,
        title: title.trim(),
        description: description.trim(),
        location: {
          name: destination.name,
          label: destination.label ?? destination.name,
          lat: destination.coordinates?.lat ?? 0,
          lon: destination.coordinates?.lon ?? 0,
        },
        startDate,
        endDate,
        budget: Number(budget),
        currency,
        numberOfPeople: travellers,
        category,
        isPublic,
        places: places.map((p, i) => ({
          description: p.description,
          category: p.category || 'other',
          orderIndex: i,
          dayNumber: p.dayNumber,
          infoPlace: { name: p.name, label: p.label || p.name, lat: p.lat, lon: p.lon },
        })),
      };
      const formData = new FormData();
      if (photoUri) {
        const filename = photoUri.split('/').pop();
        const ext = filename.split('.').pop().toLowerCase();
        formData.append('file', { uri: photoUri, name: filename, type: ext === 'png' ? 'image/png' : 'image/jpeg' });
      }
      formData.append('itinerary', JSON.stringify(body));
      await createItinerary(formData);
      if (me?.id) {
        dispatch(setUserInfo(me.id));
        dispatch(setUserInfoItineraries());
      }
      navigation.navigate('Tabs', { screen: 'Profile' });
    } catch (err) {
      Alert.alert(t('errors.somethingWrong'), err?.message || t('createItinerary.errorCreate'));
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t('createItinerary.permissionNeeded'), t('createItinerary.permissionDesc')); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) setPhotoUri(result.assets[0].uri);
  };

  return (
    <View style={ls.root}>
      {/* Header */}
      <View style={[ls.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={ls.headerBack} onPress={() => navigation.goBack()}>
          <Text style={ls.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={ls.headerCenter}>
          <Text style={ls.headerTitle}>{t('createItinerary.newItinerary')}</Text>
          {destination?.name && (
            <Text style={ls.headerSubtitle} numberOfLines={1}>📍 {destination.name}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[ls.headerSave, saving && ls.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={ls.headerSaveText}>{saving ? t('createItinerary.saving') : t('createItinerary.create')}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={ls.progressBar}>
        <View style={[ls.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={ls.progressLabel}>{t('createItinerary.percentComplete', { percent: progress })}</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[ls.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Photo */}
          <TouchableOpacity
            style={[ls.photoCard, isPhotoComplete && ls.photoCardComplete]}
            onPress={pickPhoto}
            activeOpacity={0.85}
          >
            {photoUri
              ? <Image source={{ uri: photoUri }} style={ls.photo} resizeMode="cover" />
              : (
                <View style={ls.photoPlaceholder}>
                  <Text style={ls.photoPlaceholderIcon}>📷</Text>
                  <Text style={ls.photoPlaceholderText}>{t('createItinerary.addCoverPhoto')}</Text>
                </View>
              )
            }
            {photoUri && (
              <View style={ls.photoOverlay}>
                <Text style={ls.photoOverlayText}>{t('createItinerary.changePhoto')}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Basic Info */}
          <Card title={t('createItinerary.basicInfo')} badge={isBasicComplete}>
            <Field label="Title" error={errors.title} hint={`${title.length}/50`} hintWarn={title.length > 45}>
              <TextInput
                style={[s.input, errors.title && s.inputError]}
                value={title}
                onChangeText={v => { setTitle(v); setErrors(e => ({ ...e, title: null })); }}
                placeholder={t('createItinerary.titlePlaceholder')}
                placeholderTextColor="#9ca3af"
                maxLength={50}
              />
            </Field>

            <Field label="Destination" error={errors.destination}>
              <View style={{ gap: 0 }}>
                <View style={ls.destInputRow}>
                  <TextInput
                    style={[s.input, { flex: 1 }, errors.destination && s.inputError, destination && ls.inputConfirmed]}
                    value={destQuery}
                    onChangeText={searchDestination}
                    placeholder={t('createItinerary.destinationPlaceholder')}
                    placeholderTextColor="#9ca3af"
                  />
                  {destSearching && (
                    <ActivityIndicator size="small" color="#0077b6" style={ls.destSpinner} />
                  )}
                </View>
                {destResults.length > 0 && (
                  <View style={ls.destResults}>
                    {destResults.map((r, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[ls.destResult, i < destResults.length - 1 && ls.destResultBorder]}
                        onPress={() => selectDestination(r)}
                      >
                        <Text style={ls.destResultName}>{r.name}</Text>
                        <Text style={ls.destResultLabel} numberOfLines={1}>{r.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </Field>

            <Field label="Description" error={errors.description} hint={`${description.length}/500`} hintWarn={description.length > 450}>
              <TextInput
                style={[s.input, s.textarea, errors.description && s.inputError]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('createItinerary.descriptionPlaceholder')}
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={500}
              />
            </Field>
          </Card>

          <CategorySection value={category} onChange={setCategory} />

          <DatesSection
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
            errors={errors}
            complete={isDatesComplete}
          />

          <PlacesSection
            places={places}
            days={days}
            setPlaces={setPlaces}
            setDays={setDays}
            isPublic={isPublic}
            complete={isPlacesComplete}
            tripDays={tripDays}
            destination={destination}
            category={category}
            travellers={travellers}
            budget={budget}
            currency={currency}
          />

          <BudgetSection
            budget={budget}
            setBudget={setBudget}
            currency={currency}
            setCurrency={setCurrency}
            travellers={travellers}
            tripDays={tripDays}
            errors={errors}
            complete={isBudgetComplete}
          />

          <TravellersSection value={travellers} onChange={setTravellers} />

          <VisibilitySection value={isPublic} onChange={setIsPublic} />

          {/* Submit hint */}
          {missingItems.length > 0 && (
            <View style={ls.missingHint}>
              <Text style={ls.missingHintText}>{t('createItinerary.stillNeeded', { items: missingItems.join(', ') })}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[ls.createBtn, saving && ls.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={ls.createBtnText}>{saving ? t('createItinerary.creating') : t('createItinerary.createBtn')}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const ls = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    ...shadow(2, 0.05, 6, 2),
  },
  headerBack: { padding: 8, marginRight: 4 },
  headerBackText: { fontSize: 20, color: '#374151' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 11, color: '#6b7280', marginTop: 1, maxWidth: 160 },
  headerSave: {
    backgroundColor: '#0077b6', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 16,
  },
  headerSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },

  progressBar: { height: 4, backgroundColor: '#e5e7eb' },
  progressFill: { height: '100%', backgroundColor: '#0077b6' },
  progressLabel: { fontSize: 11, color: '#6b7280', textAlign: 'right', paddingHorizontal: 16, paddingVertical: 4, backgroundColor: '#fff' },

  scroll: { padding: 16, gap: 14 },

  photoCard: {
    height: 180, borderRadius: 14, overflow: 'hidden',
    backgroundColor: '#e5e7eb', borderWidth: 2, borderStyle: 'dashed', borderColor: '#cbd5e1',
  },
  photoCardComplete: { borderStyle: 'solid', borderColor: '#0077b6', borderWidth: 2 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoPlaceholderIcon: { fontSize: 32 },
  photoPlaceholderText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  photoOverlayText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  inputConfirmed: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  destInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  destSpinner: { marginLeft: 4 },
  destResults: {
    backgroundColor: '#fff', borderRadius: 10, marginTop: 4,
    borderWidth: 1, borderColor: '#e5e7eb',
    ...shadow(2, 0.06, 6, 2),
  },
  destResult: { padding: 12 },
  destResultBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  destResultName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  destResultLabel: { fontSize: 12, color: '#6b7280', marginTop: 1 },

  missingHint: {
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#fde68a',
  },
  missingHintText: { fontSize: 13, color: '#92400e' },

  createBtn: {
    backgroundColor: '#0077b6', borderRadius: 999,
    paddingVertical: 16, alignItems: 'center',
    ...shadow(4, 0.2, 10, 4),
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default CreateItineraryScreen;
