import { useState } from 'react';
import {
  Alert, ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  currencyOptions, generateSmartItinerary, getCurrencySymbol,
  itineraryCategories, placeCategories,
} from '@tobeatraveller/shared';
import { COLORS, shadow } from '../../utils/styles';
import { STEP_CONFIG, STEP_NAME_HINT, getStepConfig } from '../../utils/stepConfig';

export const CATEGORY_EMOJI = {
  adventure:'🧗', relax:'🧘', culture:'🏛', romantic:'💕',
  roadtrip:'🚗', family:'👨‍👩‍👧', backpacking:'🎒', wellness:'🌿',
  gastronomic:'🍽', party:'🎉', sport:'⚽', other:'📍',
};
export const BUDGET_PRESET_RATES = [
  { key: 'backpacker', rate: 50 },
  { key: 'midRange',   rate: 150 },
  { key: 'luxury',     rate: 400 },
];

// ─── Card ────────────────────────────────────────────────────────────────────
export const Card = ({ title, badge, children }) => (
  <View style={s.card}>
    <View style={s.cardTitleRow}>
      <Text style={s.cardTitle}>{title}</Text>
      {badge && <View style={s.cardBadge}><Text style={s.cardBadgeText}>✓</Text></View>}
    </View>
    {children}
  </View>
);

// ─── Field ───────────────────────────────────────────────────────────────────
export const Field = ({ label, error, hint, hintWarn, children, style }) => (
  <View style={[s.field, style]}>
    <View style={s.fieldLabelRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      {hint && <Text style={[s.fieldHint, hintWarn && s.fieldHintWarn]}>{hint}</Text>}
    </View>
    {children}
    {error && <Text style={s.fieldError}>{error}</Text>}
  </View>
);

// ─── PlaceCard ───────────────────────────────────────────────────────────────
export const PlaceCard = ({
  place, onUpdate, onRemove,
  days = [], currentDay, onMoveToDay,
  onMoveUp, onMoveDown, isFirst, isLast,
}) => {
  const { t } = useTranslation();
  const [showDesc, setShowDesc] = useState(!!place.description);
  const otherDays = days.filter(d => d !== currentDay);
  return (
    <View style={s.placeCard}>
      {/* Header: reorder + name + delete */}
      <View style={s.placeCardHeader}>
        <View style={s.placeOrderBtns}>
          <TouchableOpacity
            style={[s.orderBtn, isFirst && s.orderBtnDisabled]}
            onPress={onMoveUp} disabled={isFirst}
          >
            <Text style={s.orderBtnText}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.orderBtn, isLast && s.orderBtnDisabled]}
            onPress={onMoveDown} disabled={isLast}
          >
            <Text style={s.orderBtnText}>↓</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={s.placeNameInput}
          value={place.name}
          onChangeText={v => onUpdate('name', v)}
          placeholder={t('itineraryForm.placeName')}
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity onPress={onRemove} style={s.placeRemoveBtn}>
          <Text style={s.placeRemoveText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Step type selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.placeCatRow} contentContainerStyle={s.placeCatContent}>
        {placeCategories.map(cat => {
          const cfg = getStepConfig(cat.value);
          const selected = place.category === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              style={[s.typeChip, selected && { backgroundColor: cfg.color, borderColor: cfg.color }]}
              onPress={() => onUpdate('category', cat.value)}
            >
              <Ionicons name={cfg.icon} size={13} color={selected ? '#fff' : cfg.color} />
              <Text style={[s.typeChipLabel, selected && s.typeChipLabelSelected]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Description */}
      {showDesc ? (
        <TextInput
          style={[s.input, s.placeDescInput]}
          value={place.description}
          onChangeText={v => onUpdate('description', v)}
          placeholder={STEP_NAME_HINT[place.category] || t('itineraryForm.descriptionOptional')}
          placeholderTextColor="#9ca3af"
          multiline maxLength={500}
        />
      ) : (
        <TouchableOpacity onPress={() => setShowDesc(true)}>
          <Text style={s.addDescLink}>{t('itineraryForm.addDescription')}</Text>
        </TouchableOpacity>
      )}

      {/* Move to another day */}
      {otherDays.length > 0 && (
        <View style={s.moveDayRow}>
          <Text style={s.moveDayLabel}>{t('itineraryForm.moveTo')}</Text>
          {otherDays.map(d => (
            <TouchableOpacity
              key={d}
              style={s.moveDayBtn}
              onPress={() => onMoveToDay?.(d)}
            >
              <Text style={s.moveDayBtnText}>{t('itineraryForm.moveToDay', { day: d })}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ─── CategorySection ─────────────────────────────────────────────────────────
export const CategorySection = ({ value, onChange, complete }) => {
  const { t } = useTranslation();
  return (
    <Card title={t('itineraryForm.tripCategory')} badge={complete}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {itineraryCategories.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[s.chip, value === cat.value && s.chipSelected]}
            onPress={() => onChange(cat.value)}
          >
            <Text style={s.chipEmoji}>{CATEGORY_EMOJI[cat.value] || '📍'}</Text>
            <Text style={[s.chipLabel, value === cat.value && s.chipLabelSelected]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Card>
  );
};

// ─── DatesSection ────────────────────────────────────────────────────────────
export const DatesSection = ({ startDate, endDate, onStartChange, onEndChange, errors, complete }) => {
  const { t } = useTranslation();
  const tripDays = (() => {
    if (!startDate || !endDate) return 1;
    return Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1);
  })();

  const applyPreset = (numDays) => {
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = new Date(start);
    end.setDate(end.getDate() + numDays - 1);
    if (!startDate) onStartChange(start);
    onEndChange(end.toISOString().split('T')[0]);
  };

  return (
    <Card title={t('itineraryForm.dates')} badge={complete}>
      <View style={s.presetsRow}>
        {[
          { labelKey: 'itineraryForm.weekend', days: 2 },
          { labelKey: 'itineraryForm.oneWeek', days: 7 },
          { labelKey: 'itineraryForm.twoWeeks', days: 14 },
        ].map(p => (
          <TouchableOpacity key={p.labelKey} style={s.presetChip} onPress={() => applyPreset(p.days)}>
            <Text style={s.presetChipText}>{t(p.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.row}>
        <Field label={t('itineraryForm.startDate')} error={errors?.startDate} style={{ flex: 1 }}>
          <TextInput
            style={[s.input, errors?.startDate && s.inputError]}
            value={startDate}
            onChangeText={onStartChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
            keyboardType="numbers-and-punctuation"
          />
        </Field>
        <View style={{ width: 12 }} />
        <Field label={t('itineraryForm.endDate')} error={errors?.endDate} style={{ flex: 1 }}>
          <TextInput
            style={[s.input, errors?.endDate && s.inputError]}
            value={endDate}
            onChangeText={onEndChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
            keyboardType="numbers-and-punctuation"
          />
        </Field>
      </View>
      <View style={s.durationBadge}>
        <Text style={s.durationText}>{`${tripDays} ${tripDays === 1 ? t('itinerary.day') : t('itinerary.days')}`}</Text>
      </View>
    </Card>
  );
};

// ─── BudgetSection ───────────────────────────────────────────────────────────
export const BudgetSection = ({ budget, setBudget, currency, setCurrency, travellers, tripDays, errors, complete }) => {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const symbol = getCurrencySymbol(currency);
  const perPerson = (() => {
    const b = parseFloat(budget);
    if (!b || travellers <= 1) return null;
    return (b / travellers).toLocaleString(undefined, { maximumFractionDigits: 2 });
  })();

  const BUDGET_PRESETS = [
    { labelKey: 'itineraryForm.backpackerPreset', rate: 50 },
    { labelKey: 'itineraryForm.midRangePreset',   rate: 150 },
    { labelKey: 'itineraryForm.luxuryPreset',      rate: 400 },
  ];

  return (
    <Card title={t('itineraryForm.budget')} badge={complete}>
      <View style={s.presetsRow}>
        {BUDGET_PRESETS.map(p => (
          <TouchableOpacity
            key={p.labelKey}
            style={s.presetChip}
            onPress={() => { setBudget(String(p.rate * (tripDays || 1))); if (!currency) setCurrency('EUR'); }}
          >
            <Text style={s.presetChipText}>{t(p.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.row}>
        <Field label={t('itineraryForm.amount')} error={errors?.budget} style={{ flex: 1 }}>
          <TextInput
            style={[s.input, errors?.budget && s.inputError]}
            value={budget}
            onChangeText={setBudget}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
          />
        </Field>
        <View style={{ width: 12 }} />
        <Field label={t('itineraryForm.currency')} style={{ flex: 1 }}>
          <TouchableOpacity style={[s.input, s.currencyBtn]} onPress={() => setShowPicker(true)}>
            <Text style={s.currencyBtnText}>{currency || t('itineraryForm.currencySelect')} {symbol ? `(${symbol})` : ''}</Text>
            <Text style={s.currencyChevron}>▾</Text>
          </TouchableOpacity>
        </Field>
      </View>
      {perPerson && <Text style={s.perPerson}>{t('itineraryForm.perPerson', { amount: `${symbol || ''}${perPerson}` })}</Text>}

      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t('itineraryForm.selectCurrency')}</Text>
            <FlatList
              data={currencyOptions}
              keyExtractor={i => i.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.currencyItem, currency === item.value && s.currencyItemSelected]}
                  onPress={() => { setCurrency(item.value); setShowPicker(false); }}
                >
                  <Text style={[s.currencyItemText, currency === item.value && s.currencyItemTextSelected]}>
                    {item.label}
                  </Text>
                  {currency === item.value && <Text style={s.currencyCheck}>✓</Text>}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 380 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </Card>
  );
};

// ─── TravellersSection ───────────────────────────────────────────────────────
export const TravellersSection = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <Card title={t('itineraryForm.travellers')}>
      <View style={s.stepperRow}>
        <TouchableOpacity
          style={[s.stepperBtn, value <= 1 && s.stepperBtnDisabled]}
          onPress={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
        >
          <Text style={s.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={s.stepperValue}>{value}</Text>
        <TouchableOpacity
          style={[s.stepperBtn, value >= 20 && s.stepperBtnDisabled]}
          onPress={() => onChange(Math.min(20, value + 1))}
          disabled={value >= 20}
        >
          <Text style={s.stepperBtnText}>+</Text>
        </TouchableOpacity>
        <Text style={s.stepperLabel}>{value === 1 ? t('itineraryForm.travellingSolo') : t('itineraryForm.groupOf', { count: value })}</Text>
      </View>
    </Card>
  );
};

// ─── VisibilitySection ───────────────────────────────────────────────────────
export const VisibilitySection = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <Card title={t('itineraryForm.visibility')}>
      <View style={s.visibilityRow}>
        {[
          { val: true,  icon: '🌍', labelKey: 'itineraryForm.visibilityPublic',  descKey: 'itineraryForm.visibilityPublicDesc' },
          { val: false, icon: '🔒', labelKey: 'itineraryForm.visibilityPrivate', descKey: 'itineraryForm.visibilityPrivateDesc' },
        ].map(opt => (
          <TouchableOpacity
            key={String(opt.val)}
            style={[s.visibilityOption, value === opt.val && s.visibilitySelected]}
            onPress={() => onChange(opt.val)}
          >
            <Text style={s.visibilityIcon}>{opt.icon}</Text>
            <Text style={s.visibilityLabel}>{t(opt.labelKey)}</Text>
            <Text style={s.visibilityDesc}>{t(opt.descKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
};

// ─── PlacesSection ───────────────────────────────────────────────────────────
export const PlacesSection = ({
  places, days, setPlaces, setDays, isPublic, complete,
  // AI + sync props (optional — only on Create)
  tripDays, destination, category, travellers, budget, currency,
}) => {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);

  const addPlace = (dayNumber) =>
    setPlaces(prev => [...prev, {
      _key: Date.now().toString(), id: undefined,
      name: '', label: '', description: '', category: 'other',
      dayNumber, lat: 0, lon: 0,
    }]);

  const updatePlace = (key, field, value) =>
    setPlaces(prev => prev.map(p => p._key === key ? { ...p, [field]: value } : p));

  const removePlace = (key) =>
    setPlaces(prev => prev.filter(p => p._key !== key));

  const moveUp = (key, dayPlaces) => {
    const idx = dayPlaces.findIndex(p => p._key === key);
    if (idx <= 0) return;
    setPlaces(prev => {
      const arr = [...prev];
      const gi = arr.findIndex(p => p._key === dayPlaces[idx]._key);
      const prevGi = arr.findIndex(p => p._key === dayPlaces[idx - 1]._key);
      [arr[gi], arr[prevGi]] = [arr[prevGi], arr[gi]];
      return arr;
    });
  };

  const moveDown = (key, dayPlaces) => {
    const idx = dayPlaces.findIndex(p => p._key === key);
    if (idx >= dayPlaces.length - 1) return;
    setPlaces(prev => {
      const arr = [...prev];
      const gi = arr.findIndex(p => p._key === dayPlaces[idx]._key);
      const nextGi = arr.findIndex(p => p._key === dayPlaces[idx + 1]._key);
      [arr[gi], arr[nextGi]] = [arr[nextGi], arr[gi]];
      return arr;
    });
  };

  const moveToDay = (key, newDay) =>
    setPlaces(prev => prev.map(p => p._key === key ? { ...p, dayNumber: newDay } : p));

  const addDay = () => {
    const max = days.length > 0 ? Math.max(...days) : 0;
    setDays(prev => [...prev, max + 1]);
  };

  const syncDays = () => {
    const newDays = Array.from({ length: tripDays }, (_, i) => i + 1);
    setDays(newDays);
  };

  const removeDay = (day) => {
    const count = places.filter(p => p.dayNumber === day).length;
    Alert.alert(
      t('itineraryForm.removeDayTitle'),
      count > 0
        ? t('itineraryForm.removeDayWithPlaces', { day, count })
        : t('itineraryForm.removeDayEmpty', { day }),
      [
        { text: t('itineraryForm.removeDayCancel'), style: 'cancel' },
        {
          text: t('itineraryForm.removeDayConfirm'), style: 'destructive',
          onPress: () => {
            setPlaces(prev => prev
              .filter(p => p.dayNumber !== day)
              .map(p => ({ ...p, dayNumber: p.dayNumber > day ? p.dayNumber - 1 : p.dayNumber }))
            );
            setDays(prev => prev.filter(d => d !== day).map(d => d > day ? d - 1 : d));
          },
        },
      ]
    );
  };

  const handleGenerateAI = async () => {
    if (!destination?.name && !destination) return;
    const destName = destination?.name ?? destination;
    setGenerating(true);
    try {
      const data = await generateSmartItinerary({
        destination: destName,
        days: tripDays || days.length || 1,
        category,
        numberOfTravellers: travellers,
        budget,
        currency,
      });
      const generated = (data.places ?? []).map((p, i) => ({
        _key: `ai-${i}-${Date.now()}`,
        id: undefined,
        name: p.title ?? '',
        label: p.label ?? p.title ?? '',
        description: p.description ?? '',
        category: p.category ?? 'other',
        dayNumber: p.dayNumber ?? 1,
        lat: parseFloat(p.latitude ?? p.lat ?? 0),
        lon: parseFloat(p.longitude ?? p.lng ?? 0),
      }));
      setPlaces(generated);
      const uniqueDays = [...new Set(generated.map(p => p.dayNumber))].sort((a, b) => a - b);
      setDays(uniqueDays.length > 0 ? uniqueDays : [1]);
    } catch {
      Alert.alert(t('errors.somethingWrong'), t('itineraryForm.errorGenerate'));
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = !!(destination?.name ?? destination);
  const showSyncHint = tripDays && tripDays > days.length;

  return (
    <Card title={t('itineraryForm.placesCount', { count: places.length })} badge={complete}>
      {/* AI generation button */}
      <View style={s.aiRow}>
        <TouchableOpacity
          style={[s.aiBtn, (!canGenerate || generating) && s.aiBtnDisabled]}
          onPress={handleGenerateAI}
          disabled={!canGenerate || generating}
        >
          {generating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.aiBtnText}>{t('itineraryForm.generateWithAI')}</Text>
          }
        </TouchableOpacity>
        {!canGenerate && (
          <Text style={s.aiHint}>{t('itineraryForm.setDestinationFirst')}</Text>
        )}
      </View>

      {/* Days/dates sync nudge */}
      {showSyncHint && (
        <View style={s.syncHint}>
          <Text style={s.syncHintText}>
            {t('itineraryForm.tripIsDays', { tripDays, configuredDays: days.length })}
          </Text>
          <TouchableOpacity style={s.syncBtn} onPress={syncDays}>
            <Text style={s.syncBtnText}>{t('itineraryForm.setToDays', { count: tripDays })}</Text>
          </TouchableOpacity>
        </View>
      )}

      {days.map(day => {
        const dayPlaces = places.filter(p => p.dayNumber === day);
        return (
          <View key={day} style={s.daySection}>
            <View style={s.dayHeader}>
              <Text style={s.dayTitle}>{t('itineraryForm.dayTitle', { day })}</Text>
              <Text style={s.dayCount}>{dayPlaces.length === 1 ? t('itineraryForm.placesInDay_one', { count: 1 }) : t('itineraryForm.placesInDay_other', { count: dayPlaces.length })}</Text>
              {days.length > 1 && (
                <TouchableOpacity onPress={() => removeDay(day)} style={s.removeDayBtn}>
                  <Text style={s.removeDayText}>{t('itineraryForm.removeDay')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {isPublic && dayPlaces.length === 0 && (
              <Text style={s.dayWarning}>{t('itineraryForm.addPlaceWarning')}</Text>
            )}
            {dayPlaces.map((place, idx) => (
              <PlaceCard
                key={place._key}
                place={place}
                days={days}
                currentDay={day}
                onMoveToDay={newDay => moveToDay(place._key, newDay)}
                onMoveUp={() => moveUp(place._key, dayPlaces)}
                onMoveDown={() => moveDown(place._key, dayPlaces)}
                isFirst={idx === 0}
                isLast={idx === dayPlaces.length - 1}
                onUpdate={(field, val) => updatePlace(place._key, field, val)}
                onRemove={() => removePlace(place._key)}
              />
            ))}
            <TouchableOpacity style={s.addPlaceBtn} onPress={() => addPlace(day)}>
              <Text style={s.addPlaceBtnText}>{t('itineraryForm.addPlaceToDay', { day })}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
      {places.length > 0 && (
        <TouchableOpacity style={s.addDayBtn} onPress={addDay}>
          <Text style={s.addDayBtnText}>{t('itineraryForm.addDay', { day: Math.max(...days) + 1 })}</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
};

// ─── Shared styles ───────────────────────────────────────────────────────────
export const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    ...shadow(2, 0.06, 8, 2),
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  cardBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  cardBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  field: {},
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  fieldHint: { fontSize: 11, color: '#9ca3af' },
  fieldHintWarn: { color: '#f59e0b' },
  fieldError: { fontSize: 12, color: '#dc2626', marginTop: 4 },

  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 11, paddingHorizontal: 13,
    fontSize: 15, color: '#111827',
  },
  inputError: { borderColor: '#dc2626' },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 12, marginRight: 8,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.bgLight },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  chipLabelSelected: { color: COLORS.primary, fontWeight: '600' },

  presetsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  presetChip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e5e7eb',
  },
  presetChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },

  durationBadge: {
    alignSelf: 'flex-start', marginTop: 8,
    backgroundColor: COLORS.bgLight, borderRadius: 999,
    paddingVertical: 3, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.primary + '50',
  },
  durationText: { fontSize: 13, color: COLORS.primaryDark, fontWeight: '600' },

  currencyBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currencyBtnText: { fontSize: 14, color: '#111827' },
  currencyChevron: { fontSize: 12, color: '#6b7280' },
  perPerson: { fontSize: 13, color: '#6b7280', marginTop: 6 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperBtnText: { fontSize: 20, color: '#374151', lineHeight: 22 },
  stepperValue: { fontSize: 20, fontWeight: '700', color: '#111827', minWidth: 28, textAlign: 'center' },
  stepperLabel: { fontSize: 14, color: '#6b7280', flex: 1 },

  visibilityRow: { flexDirection: 'row', gap: 10 },
  visibilityOption: {
    flex: 1, borderRadius: 12, padding: 14, borderWidth: 1.5,
    borderColor: '#e5e7eb', alignItems: 'center', backgroundColor: '#f9fafb',
  },
  visibilitySelected: { borderColor: COLORS.primary, backgroundColor: COLORS.bgLight },
  visibilityIcon: { fontSize: 22, marginBottom: 4 },
  visibilityLabel: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  visibilityDesc: { fontSize: 11, color: '#6b7280', textAlign: 'center' },

  daySection: { marginBottom: 16 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dayTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  dayCount: { fontSize: 13, color: '#9ca3af', flex: 1 },
  removeDayBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  removeDayText: { fontSize: 12, color: '#ef4444' },
  dayWarning: { fontSize: 12, color: '#f59e0b', marginBottom: 8 },

  placeCard: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb',
  },
  placeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  placeNameInput: {
    flex: 1, fontSize: 14, color: '#111827', fontWeight: '500',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4,
  },
  placeRemoveBtn: { padding: 4 },
  placeRemoveText: { color: '#9ca3af', fontSize: 14 },
  placeCatRow: { marginBottom: 10 },
  placeCatContent: { gap: 6, paddingVertical: 2 },
  placeCatChip: {
    width: 34, height: 34, borderRadius: 8, marginRight: 6,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: 11,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  typeChipLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  typeChipLabelSelected: { color: '#fff', fontWeight: '600' },
  // (kept for compatibility — replaced by typeChip below)
  placeCatChipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.bgLight },
  placeCatEmoji: { fontSize: 16 },
  placeDescInput: { minHeight: 60, textAlignVertical: 'top', marginTop: 4 },
  // Place reorder + move-to-day
  placeOrderBtns: { flexDirection: 'column', gap: 2, marginRight: 6 },
  orderBtn: {
    width: 22, height: 22, borderRadius: 4,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  orderBtnDisabled: { opacity: 0.3 },
  orderBtnText: { fontSize: 11, color: '#374151', lineHeight: 13 },
  moveDayRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  moveDayLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  moveDayBtn: {
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  moveDayBtnText: { fontSize: 11, color: '#374151', fontWeight: '500' },

  // AI generation
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#7c3aed', borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 16,
    minWidth: 48, justifyContent: 'center',
  },
  aiBtnDisabled: { opacity: 0.45 },
  aiBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  aiHint: { fontSize: 12, color: '#9ca3af', flex: 1 },

  // Days sync nudge
  syncHint: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fffbeb', borderRadius: 8, padding: 10,
    marginBottom: 12, borderWidth: 1, borderColor: '#fde68a',
  },
  syncHintText: { fontSize: 12, color: '#92400e', flex: 1 },
  syncBtn: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999,
    backgroundColor: '#f59e0b',
  },
  syncBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  addDescLink: { fontSize: 13, color: COLORS.primary, marginTop: 4 },
  addPlaceBtn: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.primary + '60',
    borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: COLORS.bgLight,
  },
  addPlaceBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '500' },
  addDayBtn: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10,
    paddingVertical: 11, alignItems: 'center', backgroundColor: COLORS.bgLight, marginTop: 4,
  },
  addDayBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, ...shadow(-8, 0.15, 24, 20),
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  currencyItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  currencyItemSelected: { backgroundColor: COLORS.bgLight },
  currencyItemText: { fontSize: 14, color: '#374151' },
  currencyItemTextSelected: { color: COLORS.primary, fontWeight: '600' },
  currencyCheck: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
