import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { FREE_PLAN_LIMITS, PACKING_LIST_NAME_MAX_LENGTH, PACKING_TEMPLATES, packingTemplateOptionsFor, selectMe, TRAVEL_STYLES } from '@tobeatraveller/shared';
import { COLORS, shadow } from '../utils/styles';

// Creating a packing list (a name, what it starts with and, if they like,
// the trip it's for) or renaming one (only the name). Once the free plan's
// lists are used up, it offers Premium.
const PackingListFormModal = ({
  visible, title, submitLabel, initialName = '', withTemplates = false, capReached = false,
  trips = [], initialTripId = null, initialTemplate = PACKING_TEMPLATES.EMPTY,
  onClose, onSubmit, onSeePlans,
}) => {
  const { t } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const isInAVan = useSelector(selectMe)?.travelStyle === TRAVEL_STYLES.VAN;
  const [template, setTemplate] = useState(initialTemplate);
  const [tripId, setTripId] = useState(initialTripId);
  const [name, setName] = useState(initialName);
  // Until they type a name of their own, it follows the template chosen.
  const [nameTouched, setNameTouched] = useState(Boolean(initialName));
  const [nameMissing, setNameMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  const templateName = (id) => p(`templates.${id}.name`);
  // Named after its trip, or else after its template, until they type a name.
  // A trip's title can be longer than a list's name may be.
  const suggestedName = trips.find(trip => trip.id === tripId)?.title.slice(0, PACKING_LIST_NAME_MAX_LENGTH)
    ?? (template === PACKING_TEMPLATES.EMPTY ? '' : templateName(template));
  const shownName = nameTouched ? name : suggestedName;

  const submit = async () => {
    const finalName = shownName.trim();
    if (!finalName) {
      setNameMissing(true);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name: finalName, template, itineraryId: tripId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {capReached ? (
            <View style={styles.cap}>
              <Ionicons name="lock-closed-outline" size={32} color={COLORS.primary} />
              <Text style={styles.capTitle}>{p('listCapTitle', { limit: FREE_PLAN_LIMITS.packingLists })}</Text>
              <Text style={styles.capDesc}>{p('listCapDesc')}</Text>
              <TouchableOpacity style={styles.submit} onPress={onSeePlans} accessibilityRole="button">
                <Text style={styles.submitText}>{t('premium.requiredCta')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {withTemplates && (
                <>
                  <Text style={styles.label}>{p('startWith')}</Text>
                  {packingTemplateOptionsFor(isInAVan).map(({ id, emoji }) => {
                    const selected = template === id;
                    return (
                      <TouchableOpacity
                        key={id}
                        style={[styles.template, selected && styles.templateSelected]}
                        onPress={() => { setTemplate(id); setNameMissing(false); }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Text style={styles.templateEmoji}>{emoji}</Text>
                        <View style={styles.templateText}>
                          <Text style={styles.templateName}>{templateName(id)}</Text>
                          <Text style={styles.templateDesc}>{p(`templates.${id}.desc`)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {withTemplates && trips.length > 0 && (
                <>
                  <Text style={styles.label}>{p('tripLabel')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tripChips} keyboardShouldPersistTaps="handled">
                    {[{ id: null, title: p('noTrip') }, ...trips].map((trip) => {
                      const selected = tripId === trip.id;
                      return (
                        <TouchableOpacity
                          key={trip.id ?? 'none'}
                          style={[styles.tripChip, selected && styles.tripChipSelected]}
                          onPress={() => setTripId(trip.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                        >
                          <Text style={[styles.tripChipText, selected && styles.tripChipTextSelected]} numberOfLines={1}>{trip.title}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <Text style={styles.label}>{p('listName')}</Text>
              <TextInput
                style={[styles.input, nameMissing && styles.inputError]}
                value={shownName}
                onChangeText={(value) => { setName(value); setNameTouched(true); setNameMissing(false); }}
                maxLength={PACKING_LIST_NAME_MAX_LENGTH}
                autoFocus={!withTemplates}
                accessibilityLabel={p('listName')}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              {nameMissing && <Text style={styles.error}>{t('validation.nameRequired')}</Text>}

              <TouchableOpacity style={[styles.submit, saving && styles.submitDisabled]} onPress={submit} disabled={saving} accessibilityRole="button">
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{submitLabel}</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: {
    maxHeight: '90%', backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    ...shadow(-4, 0.12, 16, 8),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  body: { padding: 20, gap: 10, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 4 },
  template: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  templateSelected: { borderColor: COLORS.primary, backgroundColor: '#fff5ef' },
  templateEmoji: { fontSize: 22 },
  templateText: { flex: 1 },
  templateName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  templateDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  tripChips: { gap: 6 },
  tripChip: {
    maxWidth: 220, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  tripChipSelected: { borderColor: COLORS.primary, backgroundColor: '#fff5ef' },
  tripChipText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  tripChipTextSelected: { color: COLORS.primary },
  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10, backgroundColor: '#f7f9fc',
    paddingVertical: 11, paddingHorizontal: 13, fontSize: 15, color: '#111827',
  },
  inputError: { borderColor: '#dc2626' },
  error: { fontSize: 12, color: '#dc2626' },
  submit: {
    marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 999,
    paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', alignSelf: 'stretch',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cap: { alignItems: 'center', gap: 8, padding: 28 },
  capTitle: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' },
  capDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});

export default PackingListFormModal;
