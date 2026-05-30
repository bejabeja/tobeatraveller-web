import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  getItineraryById, selectAuthUser, selectMe,
  setUserInfo, updateItinerary,
} from '@tobeatraveller/shared';
import {
  BudgetSection, Card, CategorySection, DatesSection,
  Field, PlacesSection, TravellersSection, VisibilitySection, s,
} from './ItineraryFormShared';
import { shadow } from '../../utils/styles';

const EditItineraryScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const me = meDetail ?? authUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [travellers, setTravellers] = useState(1);
  const [isPublic, setIsPublic] = useState(true);
  const [places, setPlaces] = useState([]);
  const [days, setDays] = useState([1]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const data = await getItineraryById(id);
        setItinerary(data);
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setCategory(data.category ?? 'other');
        setStartDate(data.startDate?.split('T')[0] ?? '');
        setEndDate(data.endDate?.split('T')[0] ?? '');
        setBudget(data.budget?.toString() ?? '');
        setCurrency(data.currency ?? 'EUR');
        setTravellers(data.numberOfPeople ?? 1);
        setIsPublic(data.isPublic ?? true);
        const loaded = (data.places ?? []).map((p, i) => ({
          _key: String(i), id: p.id,
          name: p.name ?? '', label: p.label ?? p.name ?? '',
          description: p.description ?? '', category: p.category ?? 'other',
          dayNumber: p.dayNumber ?? 1,
          lat: Number(p.latitude) || 0, lon: Number(p.longitude) || 0,
        }));
        setPlaces(loaded);
        const uniqueDays = loaded.length > 0
          ? [...new Set(loaded.map(p => p.dayNumber))].sort((a, b) => a - b)
          : [1];
        setDays(uniqueDays);
      } catch {
        Alert.alert('Error', 'Could not load itinerary.');
        navigation.goBack();
      } finally { setLoading(false); }
    })();
  }, [id]);

  const tripDays = (() => {
    if (!startDate || !endDate) return 1;
    return Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1);
  })();

  const validate = () => {
    const e = {};
    if (!title.trim() || title.length < 2) e.title = 'Title must be at least 2 characters';
    if (title.length > 50) e.title = 'Max 50 characters';
    if (description.length > 500) e.description = 'Max 500 characters';
    if (!startDate) e.startDate = 'Start date required';
    if (!endDate) e.endDate = 'End date required';
    if (startDate && endDate && endDate < startDate) e.endDate = 'End date must be after start';
    if (!budget || isNaN(parseFloat(budget))) e.budget = 'Valid budget required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (isPublic) {
      const emptyDays = days.filter(d => !places.some(p => p.dayNumber === d));
      if (emptyDays.length > 0) {
        Alert.alert('Empty days', `Day ${emptyDays.join(', ')} ${emptyDays.length === 1 ? 'has' : 'have'} no places. Add places or switch to private.`);
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
          name: itinerary.location.name,
          label: itinerary.location.label,
          lat: itinerary.location.lat,
          lon: itinerary.location.lon,
        },
        startDate, endDate,
        budget: Number(budget), currency,
        numberOfPeople: travellers, category, isPublic,
        places: places.map((p, i) => ({
          id: p.id, description: p.description,
          category: p.category || 'other', orderIndex: i, dayNumber: p.dayNumber,
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
      await updateItinerary(id, formData);
      if (me?.id) dispatch(setUserInfo(me.id));
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    Alert.alert('Discard changes?', 'Unsaved changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) setPhotoUri(result.assets[0].uri);
  };

  if (loading) return <ActivityIndicator size="large" color="#E8743B" style={{ flex: 1, marginTop: 60 }} />;

  const currentPhoto = photoUri || itinerary?.photoUrl;

  return (
    <View style={ls.root}>
      <View style={[ls.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={ls.headerBack} onPress={handleCancel}>
          <Text style={ls.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={ls.headerTitle}>Edit Itinerary</Text>
        <TouchableOpacity
          style={[ls.headerSave, saving && ls.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={ls.headerSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[ls.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo */}
          <TouchableOpacity style={ls.photoCard} onPress={pickPhoto} activeOpacity={0.85}>
            {currentPhoto
              ? <Image source={{ uri: currentPhoto }} style={ls.photo} resizeMode="cover" />
              : <View style={ls.photoPlaceholder}><Text style={ls.photoPlaceholderText}>📷 Tap to add photo</Text></View>
            }
            <View style={ls.photoOverlay}>
              <Text style={ls.photoOverlayText}>📷 Change photo</Text>
            </View>
          </TouchableOpacity>

          {/* Basic Info */}
          <Card title="Basic Info">
            <Field label="Title" error={errors.title} hint={`${title.length}/50`} hintWarn={title.length > 45}>
              <TextInput
                style={[s.input, errors.title && s.inputError]}
                value={title}
                onChangeText={v => { setTitle(v); setErrors(e => ({ ...e, title: null })); }}
                placeholder="A weekend in Rome…"
                placeholderTextColor="#9ca3af"
                maxLength={50}
              />
            </Field>
            <Field label="Destination">
              <View style={[s.input, ls.inputDisabled]}>
                <Text style={ls.inputDisabledText}>{itinerary?.location?.name || '—'}</Text>
              </View>
              <Text style={ls.fieldNote}>Destination cannot be changed after creation.</Text>
            </Field>
            <Field label="Description" error={errors.description} hint={`${description.length}/500`} hintWarn={description.length > 450}>
              <TextInput
                style={[s.input, s.textarea, errors.description && s.inputError]}
                value={description}
                onChangeText={setDescription}
                placeholder="What makes this trip special?"
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={500}
              />
            </Field>
          </Card>

          <CategorySection value={category} onChange={setCategory} />

          <DatesSection
            startDate={startDate} endDate={endDate}
            onStartChange={v => { setStartDate(v); setErrors(e => ({ ...e, startDate: null })); }}
            onEndChange={v => { setEndDate(v); setErrors(e => ({ ...e, endDate: null })); }}
            errors={errors}
          />

          <PlacesSection
            places={places} days={days}
            setPlaces={setPlaces} setDays={setDays}
            isPublic={isPublic}
            tripDays={tripDays}
            destination={itinerary?.location}
            category={category}
            travellers={travellers}
            budget={budget}
            currency={currency}
          />

          <BudgetSection
            budget={budget} setBudget={setBudget}
            currency={currency} setCurrency={setCurrency}
            travellers={travellers} tripDays={tripDays}
            errors={errors}
          />

          <TravellersSection value={travellers} onChange={setTravellers} />
          <VisibilitySection value={isPublic} onChange={setIsPublic} />

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const ls = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
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
  headerSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  scroll: { padding: 16, gap: 14 },
  photoCard: { height: 180, borderRadius: 14, overflow: 'hidden', backgroundColor: '#e5e7eb', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText: { fontSize: 16, color: '#9ca3af' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  photoOverlayText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  inputDisabled: { backgroundColor: '#f3f4f6', justifyContent: 'center', paddingVertical: 13 },
  inputDisabledText: { fontSize: 15, color: '#6b7280' },
  fieldNote: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
});

export default EditItineraryScreen;
