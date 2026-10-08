import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { packingCategories } from '@tobeatraveller/shared';
import { COLORS, shadow } from '../utils/styles';

const NAME_MAX_LENGTH = 255;
const MAX_QUANTITY = 99;

// Renaming something, moving it to another category or saying how many to
// take. One means just the thing, with no number next to it.
const PackingItemFormModal = ({ item, categoryLabel, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [quantity, setQuantity] = useState(item.quantity ?? 1);
  const [nameMissing, setNameMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setNameMissing(true);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), category, quantity: quantity > 1 ? quantity : null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">{p('editItem')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>{p('itemName')}</Text>
            <TextInput
              style={[styles.input, nameMissing && styles.inputError]}
              value={name}
              onChangeText={(value) => { setName(value); setNameMissing(false); }}
              maxLength={NAME_MAX_LENGTH}
              accessibilityLabel={p('itemName')}
            />
            {nameMissing && <Text style={styles.error}>{t('validation.nameRequired')}</Text>}

            <Text style={styles.label}>{p('categoryLabel')}</Text>
            <View style={styles.chips}>
              {packingCategories.map(({ value }) => {
                const selected = category === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setCategory(value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{categoryLabel(value)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>{p('quantity')}</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepperBtn, quantity <= 1 && styles.stepperBtnDisabled]}
                onPress={() => setQuantity(value => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                accessibilityRole="button"
                accessibilityLabel={p('quantityLess')}
              >
                <Ionicons name="remove" size={18} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.stepperValue} accessibilityLabel={`${p('quantity')}: ${quantity}`}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.stepperBtn, quantity >= MAX_QUANTITY && styles.stepperBtnDisabled]}
                onPress={() => setQuantity(value => Math.min(MAX_QUANTITY, value + 1))}
                disabled={quantity >= MAX_QUANTITY}
                accessibilityRole="button"
                accessibilityLabel={p('quantityMore')}
              >
                <Ionicons name="add" size={18} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.hint}>{p('quantityHint')}</Text>
            </View>

            <TouchableOpacity style={[styles.submit, saving && styles.submitDisabled]} onPress={submit} disabled={saving} accessibilityRole="button">
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('common.save')}</Text>}
            </TouchableOpacity>
          </ScrollView>
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
  input: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10, backgroundColor: '#f7f9fc',
    paddingVertical: 11, paddingHorizontal: 13, fontSize: 15, color: '#111827',
  },
  inputError: { borderColor: '#dc2626' },
  error: { fontSize: 12, color: '#dc2626' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: '#fff5ef' },
  chipText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  chipTextSelected: { color: COLORS.primary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  stepperBtn: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperValue: { fontSize: 18, fontWeight: '700', color: '#111827', minWidth: 24, textAlign: 'center' },
  hint: { flex: 1, minWidth: 140, fontSize: 12, color: '#6b7280' },
  submit: {
    marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 999,
    paddingVertical: 14, alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default PackingItemFormModal;
