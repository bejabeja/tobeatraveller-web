import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, shadow } from '../utils/styles';

// Which of the user's trips a packing list is for, or none.
const PackingListTripModal = ({ trips, currentTripId = null, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const [tripId, setTripId] = useState(currentTripId);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit(tripId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">{p('tripLabel')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {trips.length === 0 ? (
            <Text style={styles.empty}>{p('noTripsToLink')}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
              {[{ id: null, title: p('noTrip') }, ...trips].map((trip) => {
                const selected = tripId === trip.id;
                return (
                  <TouchableOpacity
                    key={trip.id ?? 'none'}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => setTripId(trip.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? COLORS.primary : '#9ca3af'} />
                    <Text style={styles.optionText} numberOfLines={2}>{trip.title}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={[styles.submit, saving && styles.submitDisabled]} onPress={submit} disabled={saving} accessibilityRole="button">
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: {
    maxHeight: '80%', backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    ...shadow(-4, 0.12, 16, 8),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  body: { padding: 16, gap: 8, paddingBottom: 32 },
  empty: { padding: 24, fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: '#fff5ef' },
  optionText: { flex: 1, fontSize: 15, color: '#111827' },
  submit: {
    marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 999,
    paddingVertical: 14, alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default PackingListTripModal;
