import { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  createItinerary, generateSmartItinerary,
  itineraryCategories, placeCategories,
  selectAuthUser, selectMe,
  setUserInfo, setUserInfoItineraries,
} from '@tobeatraveller/shared';
import { COLORS, shadow } from '../../utils/styles';
import { getStepConfig, STEP_NAME_HINT } from '../../utils/stepConfig';
import { GEOAPIFY_KEY } from '../../utils/config';

const CATEGORY_EMOJI = {
  adventure:'🧗', relax:'🧘', culture:'🏛', romantic:'💕',
  roadtrip:'🚗', family:'👨‍👩‍👧', backpacking:'🎒', wellness:'🌿',
  gastronomic:'🍽', party:'🎉', sport:'⚽', other:'📍',
};

const PlanExperienceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const me = meDetail ?? authUser;

  // phase: 'input' | 'review'
  const [phase, setPhase] = useState('input');

  // Input state
  const [destQuery, setDestQuery]       = useState('');
  const [destination, setDestination]   = useState(null);
  const [destResults, setDestResults]   = useState([]);
  const [destSearching, setDestSearching] = useState(false);
  const [days, setDays]                 = useState(7);
  const [category, setCategory]         = useState('adventure');
  const [travelers, setTravelers]       = useState(1);
  const [generating, setGenerating]     = useState(false);

  // Review state
  const [title, setTitle]               = useState('');
  const [steps, setSteps]               = useState([]);
  const [editingKey, setEditingKey]     = useState(null);
  const [editDraft, setEditDraft]       = useState(null);
  const [saving, setSaving]             = useState(false);

  const destTimer = useRef(null);

  // ─── Destination search ───────────────────────────────────────────────────
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
  };

  // ─── AI generation ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!destination?.name) return;
    setGenerating(true);
    try {
      const data = await generateSmartItinerary({
        destination: destination.name, days, category,
        numberOfTravellers: travelers, budget: null, currency: 'EUR',
      });
      const generated = (data.places ?? []).map((p, i) => ({
        _key: `ai-${i}`,
        name: p.title ?? '',
        description: p.description ?? '',
        category: p.category ?? 'other',
        dayNumber: p.dayNumber ?? 1,
        lat: parseFloat(p.latitude ?? p.lat ?? 0),
        lon: parseFloat(p.longitude ?? p.lng ?? 0),
      }));
      setSteps(generated);
      setTitle(`My trip to ${destination.name}`);
      setPhase('review');
    } catch {
      Alert.alert('Oops', 'Could not generate the experience. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Step editing ─────────────────────────────────────────────────────────
  const openEdit = (step) => {
    setEditDraft({ ...step });
    setEditingKey(step._key);
  };

  const saveEdit = () => {
    setSteps(prev => prev.map(s => s._key === editingKey ? { ...editDraft } : s));
    setEditingKey(null);
    setEditDraft(null);
  };

  const removeStep = (key) => {
    setSteps(prev => prev.filter(s => s._key !== key));
    setEditingKey(null);
    setEditDraft(null);
  };

  const addStep = () => {
    const lastDay = steps.length > 0 ? Math.max(...steps.map(s => s.dayNumber)) : 1;
    const fresh = { _key: `new-${Date.now()}`, name: '', description: '', category: 'other', dayNumber: lastDay, lat: 0, lon: 0 };
    setSteps(prev => [...prev, fresh]);
    openEdit(fresh);
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Add a title', 'Give your trip a name.'); return; }
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const endObj = new Date(today);
    endObj.setDate(endObj.getDate() + days - 1);
    const endDate = endObj.toISOString().split('T')[0];
    try {
      const body = {
        userId: me?.id,
        title: title.trim(),
        description: '',
        location: {
          name: destination.name,
          label: destination.label ?? destination.name,
          lat: destination.coordinates?.lat ?? 0,
          lon: destination.coordinates?.lon ?? 0,
        },
        startDate: today, endDate,
        budget: 0, currency: 'EUR',
        numberOfPeople: travelers,
        category, isPublic: false,
        places: steps.filter(s => s.name.trim()).map((s, i) => ({
          description: s.description,
          category: s.category || 'other',
          orderIndex: i,
          dayNumber: s.dayNumber,
          infoPlace: { name: s.name, label: s.name, lat: s.lat || 0, lon: s.lon || 0 },
        })),
      };
      const formData = new FormData();
      formData.append('itinerary', JSON.stringify(body));
      await createItinerary(formData);
      if (me?.id) { dispatch(setUserInfo(me.id)); dispatch(setUserInfoItineraries()); }
      navigation.navigate('Tabs', { screen: 'Profile' });
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not save the trip.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Group steps by day ───────────────────────────────────────────────────
  const dayMap = {};
  steps.forEach(s => {
    const d = s.dayNumber ?? 1;
    if (!dayMap[d]) dayMap[d] = [];
    dayMap[d].push(s);
  });
  const dayNumbers = Object.keys(dayMap).map(Number).sort((a, b) => a - b);
  const isMultiDay = dayNumbers.length > 1;

  return (
    <View style={ls.root}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.accentDark, COLORS.accent]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[ls.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity
          style={ls.backBtn}
          onPress={() => phase === 'review' ? setPhase('input') : navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={ls.headerCenter}>
          <Text style={ls.headerTitle}>{phase === 'input' ? 'Plan an Experience' : 'Review your trip'}</Text>
          {phase === 'review' && destination?.name && (
            <Text style={ls.headerSub}>{destination.name}</Text>
          )}
        </View>
        {phase === 'review' ? (
          <TouchableOpacity style={[ls.saveBtn, saving && ls.disabled]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={ls.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </LinearGradient>

      {phase === 'input' ? (
        /* ── INPUT PHASE ─────────────────────────────────────────────── */
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[ls.scroll, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Destination */}
            <View style={ls.section}>
              <Text style={ls.sectionLabel}>Where to?</Text>
              <View style={ls.destBox}>
                <Ionicons name="location-outline" size={20} color={COLORS.accent} />
                <TextInput
                  style={ls.destInput}
                  value={destQuery}
                  onChangeText={searchDestination}
                  placeholder="e.g. Helsinki, Kyoto, Patagonia…"
                  placeholderTextColor="#9ca3af"
                  autoFocus
                />
                {destSearching && <ActivityIndicator size="small" color={COLORS.accent} />}
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
              {destination && (
                <View style={ls.destConfirmed}>
                  <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
                  <Text style={ls.destConfirmedText} numberOfLines={1}>{destination.label ?? destination.name}</Text>
                </View>
              )}
            </View>

            {/* Days */}
            <View style={ls.section}>
              <Text style={ls.sectionLabel}>How many days?</Text>
              <View style={ls.stepperBox}>
                <TouchableOpacity
                  style={[ls.stepperBtn, days <= 1 && ls.stepperBtnOff]}
                  onPress={() => setDays(d => Math.max(1, d - 1))}
                  disabled={days <= 1}
                >
                  <Ionicons name="remove" size={22} color={days <= 1 ? '#D1D5DB' : COLORS.accent} />
                </TouchableOpacity>
                <View style={ls.stepperMid}>
                  <Text style={ls.stepperNum}>{days}</Text>
                  <Text style={ls.stepperUnit}>{days === 1 ? 'day' : 'days'}</Text>
                </View>
                <TouchableOpacity
                  style={[ls.stepperBtn, days >= 30 && ls.stepperBtnOff]}
                  onPress={() => setDays(d => Math.min(30, d + 1))}
                  disabled={days >= 30}
                >
                  <Ionicons name="add" size={22} color={days >= 30 ? '#D1D5DB' : COLORS.accent} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Category */}
            <View style={ls.section}>
              <Text style={ls.sectionLabel}>What kind of trip?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ls.catRow}>
                {itineraryCategories.filter(c => c.value !== 'other').map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[ls.catChip, category === cat.value && ls.catChipOn]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text style={ls.catEmoji}>{CATEGORY_EMOJI[cat.value]}</Text>
                    <Text style={[ls.catLabel, category === cat.value && ls.catLabelOn]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Travelers */}
            <View style={ls.section}>
              <Text style={ls.sectionLabel}>Travelers</Text>
              <View style={ls.stepperBox}>
                <TouchableOpacity
                  style={[ls.stepperBtn, travelers <= 1 && ls.stepperBtnOff]}
                  onPress={() => setTravelers(t => Math.max(1, t - 1))}
                  disabled={travelers <= 1}
                >
                  <Ionicons name="remove" size={22} color={travelers <= 1 ? '#D1D5DB' : COLORS.accent} />
                </TouchableOpacity>
                <View style={ls.stepperMid}>
                  <Text style={ls.stepperNum}>{travelers}</Text>
                  <Text style={ls.stepperUnit}>{travelers === 1 ? 'person' : 'people'}</Text>
                </View>
                <TouchableOpacity
                  style={[ls.stepperBtn, travelers >= 20 && ls.stepperBtnOff]}
                  onPress={() => setTravelers(t => Math.min(20, t + 1))}
                  disabled={travelers >= 20}
                >
                  <Ionicons name="add" size={22} color={travelers >= 20 ? '#D1D5DB' : COLORS.accent} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Generate CTA */}
            <TouchableOpacity
              style={[ls.genBtn, (!destination || generating) && ls.disabled]}
              onPress={handleGenerate}
              disabled={!destination || generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={ls.genBtnText}>Planning your trip…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="flash-outline" size={22} color="#fff" />
                  <Text style={ls.genBtnText}>Let AI plan it</Text>
                </>
              )}
            </TouchableOpacity>
            {!destination && (
              <Text style={ls.genHint}>Enter a destination to get started</Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* ── REVIEW PHASE ────────────────────────────────────────────── */
        <ScrollView
          contentContainerStyle={[ls.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={ls.card}>
            <Text style={ls.cardLabel}>Trip name</Text>
            <TextInput
              style={ls.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Give your trip a name…"
              placeholderTextColor="#9ca3af"
              maxLength={50}
            />
          </View>

          {/* Timeline */}
          <View style={ls.card}>
            <View style={ls.timelineTop}>
              <Text style={ls.timelineCount}>{steps.length} steps · {days} {days === 1 ? 'day' : 'days'}</Text>
              <TouchableOpacity style={ls.regenBtn} onPress={() => setPhase('input')}>
                <Ionicons name="refresh-outline" size={13} color={COLORS.primary} />
                <Text style={ls.regenBtnText}>Regenerate</Text>
              </TouchableOpacity>
            </View>

            {(isMultiDay ? dayNumbers : [null]).map(day => (
              <View key={day ?? 'all'}>
                {isMultiDay && (
                  <View style={ls.dayHeader}>
                    <View style={ls.dayDot} />
                    <Text style={ls.dayLabel}>Day {day}</Text>
                    <View style={ls.dayLine} />
                  </View>
                )}
                {(day !== null ? dayMap[day] : steps).map((step, idx) => {
                  const list = day !== null ? dayMap[day] : steps;
                  return (
                    <EditableStep
                      key={step._key}
                      step={step}
                      isLast={idx === list.length - 1}
                      onEdit={() => openEdit(step)}
                    />
                  );
                })}
              </View>
            ))}

            <TouchableOpacity style={ls.addStepBtn} onPress={addStep}>
              <Ionicons name="add-circle-outline" size={17} color={COLORS.primary} />
              <Text style={ls.addStepText}>Add step</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[ls.saveFullBtn, saving && ls.disabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={ls.saveFullBtnText}>{saving ? 'Saving…' : 'Save trip'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Edit step modal ──────────────────────────────────────────── */}
      <Modal
        visible={editingKey !== null}
        animationType="slide"
        transparent
        onRequestClose={() => { setEditingKey(null); setEditDraft(null); }}
      >
        <View style={ls.modalBackdrop}>
          <View style={ls.modalSheet}>
            <View style={ls.modalHandle} />
            <Text style={ls.modalTitle}>Edit step</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ls.editTypeRow}>
              {placeCategories.map(cat => {
                const cfg = getStepConfig(cat.value);
                const on = editDraft?.category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[ls.typeChip, on && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                    onPress={() => setEditDraft(d => ({ ...d, category: cat.value }))}
                  >
                    <Ionicons name={cfg.icon} size={13} color={on ? '#fff' : cfg.color} />
                    <Text style={[ls.typeChipLabel, on && { color: '#fff', fontWeight: '600' }]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              style={ls.editInput}
              value={editDraft?.name ?? ''}
              onChangeText={v => setEditDraft(d => ({ ...d, name: v }))}
              placeholder={STEP_NAME_HINT[editDraft?.category] ?? 'Step name…'}
              placeholderTextColor="#9ca3af"
              maxLength={100}
            />
            <TextInput
              style={[ls.editInput, ls.editTextarea]}
              value={editDraft?.description ?? ''}
              onChangeText={v => setEditDraft(d => ({ ...d, description: v }))}
              placeholder="Add details, tips, or narrative…"
              placeholderTextColor="#9ca3af"
              multiline maxLength={500}
            />

            <View style={ls.modalActions}>
              <TouchableOpacity style={ls.deleteBtn} onPress={() => removeStep(editingKey)}>
                <Text style={ls.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ls.doneBtn} onPress={saveEdit}>
                <Text style={ls.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Editable step ────────────────────────────────────────────────────────────
const EditableStep = ({ step, isLast, onEdit }) => {
  const cfg = getStepConfig(step.category);
  return (
    <TouchableOpacity style={etl.row} onPress={onEdit} activeOpacity={0.72}>
      <View style={etl.col}>
        <View style={[etl.dot, { backgroundColor: cfg.color }]}>
          <Ionicons name={cfg.icon} size={13} color="#fff" />
        </View>
        {!isLast && <View style={etl.connector} />}
      </View>
      <View style={[etl.content, isLast && etl.contentLast]}>
        <View style={[etl.badge, { backgroundColor: cfg.color + '22' }]}>
          <Text style={[etl.badgeText, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
        </View>
        <Text style={etl.name} numberOfLines={1}>
          {step.name || 'Tap to add name…'}
        </Text>
        {step.description ? <Text style={etl.desc} numberOfLines={2}>{step.description}</Text> : null}
        <View style={etl.editHint}>
          <Ionicons name="pencil-outline" size={11} color="#9CA3AF" />
          <Text style={etl.editHintText}>Edit</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const etl = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  col: { width: 28, alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  connector: { width: 2, flex: 1, minHeight: 12, backgroundColor: '#E5E7EB', marginVertical: 3 },
  content: { flex: 1, paddingBottom: 18, paddingTop: 1 },
  contentLast: { paddingBottom: 4 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7, marginBottom: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  name: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3, lineHeight: 20 },
  desc: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 2 },
  editHint: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  editHintText: { fontSize: 11, color: '#9CA3AF' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const ls = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#A8D5C7', marginTop: 1 },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.5 },

  scroll: { padding: 16, gap: 16 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  destBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    ...shadow(2, 0.06, 6, 2),
  },
  destInput: { flex: 1, fontSize: 15, color: '#111827' },
  destResults: {
    backgroundColor: '#fff', borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#E5E7EB', ...shadow(2, 0.06, 6, 2),
  },
  destResult: { padding: 13 },
  destResultBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  destResultName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  destResultLabel: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  destConfirmed: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, paddingTop: 3 },
  destConfirmedText: { fontSize: 12, color: '#16a34a', fontWeight: '500', flex: 1 },

  stepperBox: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnOff: { opacity: 0.35 },
  stepperMid: { flex: 1, alignItems: 'center' },
  stepperNum: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  stepperUnit: { fontSize: 12, color: '#9CA3AF', marginTop: -2 },

  catRow: { gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 13,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff',
  },
  catChipOn: { borderColor: COLORS.accent, backgroundColor: '#E8F4F2' },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  catLabelOn: { color: COLORS.accent, fontWeight: '700' },

  genBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingVertical: 18, marginTop: 8,
    ...shadow(4, 0.2, 12, 4),
  },
  genBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  genHint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 6 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB', ...shadow(1, 0.04, 4, 1),
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  titleInput: { fontSize: 19, fontWeight: '700', color: COLORS.text },

  timelineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  timelineCount: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: 999, borderWidth: 1, borderColor: COLORS.primary + '50',
    backgroundColor: COLORS.bgLight,
  },
  regenBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 },
  dayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  dayLabel: { fontSize: 11, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 },
  dayLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },

  addStepBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    paddingVertical: 10, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: COLORS.primary + '60', borderRadius: 10, justifyContent: 'center',
    backgroundColor: COLORS.bgLight,
  },
  addStepText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },

  saveFullBtn: {
    backgroundColor: COLORS.accent, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    ...shadow(4, 0.18, 12, 4),
  },
  saveFullBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
    ...shadow(-4, 0.15, 20, 16),
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  editTypeRow: { gap: 6, paddingBottom: 12 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: 11,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  typeChipLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  editInput: {
    borderWidth: 1.5, borderColor: '#DDE3EC', borderRadius: 10,
    backgroundColor: '#F7F9FC', paddingVertical: 11, paddingHorizontal: 13,
    fontSize: 15, color: '#111827', marginBottom: 10,
  },
  editTextarea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  deleteBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  deleteBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 14 },
  doneBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.accent },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default PlanExperienceScreen;
