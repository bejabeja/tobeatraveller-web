import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  defaultPackingItems, getPackingChecklist, isNetworkError, isPremiumRequiredError, normalizeSearchText,
  packingCategories, seedPackingChecklistDefaults, selectMe,
} from '@tobeatraveller/shared';
import FeatureLoadState from '../../components/FeatureLoadState';
import { PendingChangesNotice } from '../../components/PendingChangesNotice';
import { newEntityId, runOrQueue } from '../../offline/outbox';
import { applyPendingChanges, CHANGE_KINDS, COLLECTIONS } from '../../offline/pendingChanges';
import { useOutbox, useRefetchAfterSync } from '../../offline/useOutbox';
import { cacheGet, cacheSet } from '../../utils/offlineCache';
import { shadow } from '../../utils/styles';

// No supply category maps cleanly onto every packing category, anything without
// an obvious match falls back to "other" rather than guessing wrong.
const PACKING_TO_SUPPLY_CATEGORY = { cleaning: 'cleaning', toiletries: 'hygiene' };
const UNDO_DELETE_WINDOW_MS = 5000;

const localizedDefaultItems = (i18n) => {
  const locale = i18n.language?.startsWith('es') ? 'es' : 'en';
  return Object.entries(defaultPackingItems[locale]).flatMap(([category, names]) =>
    names.map(name => ({ category, name }))
  );
};

const PackingChecklistScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const insets = useSafeAreaInsets();
  const me = useSelector(selectMe);
  const cacheKey = `packingchecklist:items:${me?.id}`;

  const [serverItems, setServerItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newItemInputs, setNewItemInputs] = useState({});
  const [addingToShoppingList, setAddingToShoppingList] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingDeletes, setPendingDeletes] = useState([]); // [{ item, timeoutId }]
  const [loadError, setLoadError] = useState(null); // null | 'premium' | 'error'
  const [showingCached, setShowingCached] = useState(false);
  const { changes } = useOutbox();

  // Items waiting out the undo window are hidden here rather than removed
  // from state, so undo also works for items that only exist in the queue.
  const items = useMemo(() => {
    const hiddenIds = new Set(pendingDeletes.map(({ item }) => item.id));
    return applyPendingChanges(serverItems, changes, COLLECTIONS.PACKING_CHECKLIST)
      .filter(item => !hiddenIds.has(item.id));
  }, [serverItems, changes, pendingDeletes]);

  const pendingDeletesRef = useRef([]);
  useEffect(() => { pendingDeletesRef.current = pendingDeletes; }, [pendingDeletes]);

  const deleteItem = (item) => runOrQueue({
    collection: COLLECTIONS.PACKING_CHECKLIST, kind: CHANGE_KINDS.DELETE, entityId: item.id, label: item.name,
  });

  useEffect(() => () => {
    pendingDeletesRef.current.forEach(({ item, timeoutId }) => {
      clearTimeout(timeoutId);
      deleteItem(item).catch(() => {});
    });
  }, []);

  const fetchData = async () => {
    try {
      let res = await getPackingChecklist();
      if (Array.isArray(res) && res.length === 0) {
        res = await seedPackingChecklistDefaults(localizedDefaultItems(i18n));
      }
      const list = Array.isArray(res) ? res : [];
      setServerItems(list);
      setLoadError(null);
      setShowingCached(false);
      cacheSet(cacheKey, list);
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = await cacheGet(cacheKey);
        if (cached) {
          setServerItems(cached);
          setLoadError(null);
          setShowingCached(true);
          return;
        }
      }
      setServerItems([]);
      setShowingCached(false);
      setLoadError(isPremiumRequiredError(err) ? 'premium' : 'error');
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }, [])
  );

  useRefetchAfterSync(fetchData);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const categoryLabel = (value) => {
    const fallback = packingCategories.find(c => c.value === value)?.label ?? value;
    return p(`category.${value}`, fallback);
  };

  const setServerItemChecked = (itemId, checked) =>
    setServerItems(prev => prev.map(i => i.id === itemId ? { ...i, checked } : i));

  const toggleChecked = async (item) => {
    setServerItemChecked(item.id, !item.checked);
    try {
      await runOrQueue({
        collection: COLLECTIONS.PACKING_CHECKLIST,
        kind: CHANGE_KINDS.UPDATE,
        entityId: item.id,
        payload: { checked: !item.checked },
        label: item.name,
      });
    } catch (err) {
      setServerItemChecked(item.id, item.checked);
      Alert.alert(t('errors.somethingWrong'), err?.message || p('saveError'));
    }
  };

  const undoRemove = (itemId) => {
    const pending = pendingDeletesRef.current.find(entry => entry.item.id === itemId);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    setPendingDeletes(prev => prev.filter(entry => entry.item.id !== itemId));
  };

  const removeItem = (item) => {
    const timeoutId = setTimeout(async () => {
      try {
        const { queued } = await deleteItem(item);
        if (!queued) setServerItems(prev => prev.filter(i => i.id !== item.id));
      } catch (err) {
        Alert.alert(t('errors.somethingWrong'), err?.message || p('deleteError'));
      } finally {
        setPendingDeletes(prev => prev.filter(entry => entry.item.id !== item.id));
      }
    }, UNDO_DELETE_WINDOW_MS);
    setPendingDeletes(prev => [...prev, { item, timeoutId }]);
  };

  const addToShoppingList = async (item) => {
    setAddingToShoppingList(item.id);
    const entityId = newEntityId();
    try {
      await runOrQueue({
        collection: COLLECTIONS.SHOPPING_LIST,
        kind: CHANGE_KINDS.CREATE,
        entityId,
        payload: {
          id: entityId,
          name: item.name,
          category: PACKING_TO_SUPPLY_CATEGORY[item.category] ?? 'other',
          amount: 1,
          unit: 'units',
        },
        label: item.name,
      });
    } catch (err) {
      Alert.alert(t('errors.somethingWrong'), err?.message || p('saveError'));
    } finally {
      setAddingToShoppingList(null);
    }
  };

  const handleAddCustomItem = async (category) => {
    const name = (newItemInputs[category] || '').trim();
    if (!name) return;
    // Same check the server does, so an offline add doesn't queue a change
    // that is bound to fail once it syncs.
    if (items.some(item => item.category === category && item.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert(t('errors.somethingWrong'), p('itemAlreadyInCategory'));
      return;
    }
    const entityId = newEntityId();
    try {
      const { queued, result } = await runOrQueue({
        collection: COLLECTIONS.PACKING_CHECKLIST,
        kind: CHANGE_KINDS.CREATE,
        entityId,
        payload: { id: entityId, category, name },
        label: name,
      });
      if (!queued) setServerItems(prev => [...prev, result]);
      setNewItemInputs(prev => ({ ...prev, [category]: '' }));
    } catch (err) {
      Alert.alert(t('errors.somethingWrong'), err?.message || p('saveError'));
    }
  };

  // Restoring defaults needs the server's template merge, so it stays online-only.
  const restoreDefaults = async () => {
    setRestoring(true);
    try {
      const res = await seedPackingChecklistDefaults(localizedDefaultItems(i18n));
      setServerItems(res);
    } catch (err) {
      Alert.alert(t('errors.somethingWrong'), isNetworkError(err) ? t('errors.networkError') : (err?.message || p('saveError')));
    } finally {
      setRestoring(false);
    }
  };

  const startNewTrip = async () => {
    setResetting(true);
    try {
      const { queued, result } = await runOrQueue({
        collection: COLLECTIONS.PACKING_CHECKLIST, kind: CHANGE_KINDS.RESET_TRIP, label: p('startNewTrip'),
      });
      if (!queued) setServerItems(result);
    } catch (err) {
      Alert.alert(t('errors.somethingWrong'), err?.message || p('saveError'));
    } finally {
      setResetting(false);
    }
  };

  const totalCount = items.length;
  const checkedCount = items.filter(i => i.checked).length;
  const query = normalizeSearchText(search.trim());
  const matchesQuery = (item) => !query || normalizeSearchText(item.name).includes(query);
  const hasSearchResults = !query || items.some(matchesQuery);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={t('common.back')}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{p('title')}</Text>
          {totalCount > 0 && (
            <View style={[styles.progressBadge, checkedCount === totalCount && styles.progressBadgeComplete]}>
              <Text style={[styles.progressText, checkedCount === totalCount && styles.progressTextComplete]}>
                {p('progress', { checked: checkedCount, total: totalCount })}
              </Text>
            </View>
          )}
        </View>

        {totalCount > 0 && (
          <>
            <View style={styles.searchRow}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={p('searchPlaceholder')}
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="#9ca3af"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={styles.clearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.toolbarActions}>
              <TouchableOpacity style={styles.ghostBtn} onPress={startNewTrip} disabled={resetting}>
                {resetting
                  ? <ActivityIndicator size="small" color="#6b7280" />
                  : <>
                      <Ionicons name="repeat-outline" size={15} color="#6b7280" />
                      <Text style={styles.ghostBtnText}>{p('startNewTrip')}</Text>
                    </>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={restoreDefaults} disabled={restoring}>
                {restoring
                  ? <ActivityIndicator size="small" color="#6b7280" />
                  : <>
                      <Ionicons name="refresh-outline" size={15} color="#6b7280" />
                      <Text style={styles.ghostBtnText}>{p('restoreDefaults')}</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <PendingChangesNotice />
      {showingCached && (
        <View style={styles.cachedBanner}>
          <Text style={styles.cachedBannerText}>{t('common.showingCachedData')}</Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E8743B" />
          }
        >
          {loading ? (
            <ActivityIndicator size="small" color="#E8743B" style={{ marginTop: 40 }} />
          ) : loadError ? (
            <FeatureLoadState status={loadError} onRetry={fetchData} />
          ) : !hasSearchResults ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎒</Text>
              <Text style={styles.emptyTitle}>{p('noSearchResults', { query: search.trim() })}</Text>
            </View>
          ) : (
            packingCategories.map(({ value: category }) => {
              const categoryItems = items
                .filter(i => i.category === category && matchesQuery(i))
                .sort((a, b) => Number(a.checked) - Number(b.checked));
              if (query && categoryItems.length === 0) return null;
              return (
                <View key={category} style={styles.category}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryTitle}>{categoryLabel(category)}</Text>
                    {categoryItems.length > 0 && (
                      <View style={[styles.categoryCount, categoryItems.every(i => i.checked) && styles.categoryCountComplete]}>
                        <Text style={[styles.categoryCountText, categoryItems.every(i => i.checked) && styles.categoryCountTextComplete]}>
                          {categoryItems.filter(i => i.checked).length}/{categoryItems.length}
                        </Text>
                      </View>
                    )}
                  </View>

                  {categoryItems.map(item => (
                    <View key={item.id} style={styles.item}>
                      <TouchableOpacity style={styles.itemLabel} onPress={() => toggleChecked(item)}>
                        <Ionicons
                          name={item.checked ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={item.checked ? '#E8743B' : '#9ca3af'}
                        />
                        <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>{item.name}</Text>
                        {item._pending && (
                          <Ionicons
                            name={item._syncFailed ? 'alert-circle-outline' : 'cloud-upload-outline'}
                            size={14}
                            color={item._syncFailed ? '#b91c1c' : '#92400e'}
                            accessibilityLabel={item._syncFailed ? t('offline.notSynced') : t('offline.pendingSync')}
                          />
                        )}
                      </TouchableOpacity>
                      <View style={styles.itemActions}>
                        {!item.checked && (
                          <TouchableOpacity
                            style={styles.itemActionBtn}
                            onPress={() => addToShoppingList(item)}
                            disabled={addingToShoppingList === item.id}
                          >
                            {addingToShoppingList === item.id
                              ? <ActivityIndicator size="small" color="#6b7280" />
                              : <Ionicons name="cart-outline" size={16} color="#6b7280" />
                            }
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.itemActionBtn} onPress={() => removeItem(item)}>
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <View style={styles.addRow}>
                    <TextInput
                      style={styles.addInput}
                      placeholder={p('addItemPlaceholder')}
                      placeholderTextColor="#9ca3af"
                      value={newItemInputs[category] || ''}
                      onChangeText={v => setNewItemInputs(prev => ({ ...prev, [category]: v }))}
                      onSubmitEditing={() => handleAddCustomItem(category)}
                      returnKeyType="done"
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={() => handleAddCustomItem(category)}>
                      <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {pendingDeletes.length > 0 && (
        <View style={[styles.undoStack, { paddingBottom: insets.bottom + 12 }]}>
          {pendingDeletes.map(({ item }) => (
            <View key={item.id} style={styles.undoBanner}>
              <Text style={styles.undoText} numberOfLines={1}>{p('itemDeleted', { name: item.name })}</Text>
              <TouchableOpacity onPress={() => undoRemove(item.id)}>
                <Text style={styles.undoBtnText}>{p('undo')}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  cachedBanner: {
    paddingVertical: 6, paddingHorizontal: 16,
    backgroundColor: '#fef3c7',
  },
  cachedBannerText: { fontSize: 12, color: '#92400e', fontWeight: '600' },

  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
    ...shadow(2, 0.05, 6, 2),
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  backBtn: { marginRight: 10, padding: 4 },
  backText: { fontSize: 20, color: '#374151' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: '#111827' },
  progressBadge: {
    backgroundColor: '#f3f4f6', borderRadius: 999,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  progressBadgeComplete: { backgroundColor: '#dcfce7' },
  progressText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  progressTextComplete: { color: '#16a34a' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#f3f4f6', borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },
  clearText: { color: '#9ca3af', fontSize: 13, padding: 4 },

  toolbarActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 12,
  },
  ghostBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },

  scroll: { padding: 12, gap: 14 },

  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, color: '#6b7280', textAlign: 'center' },

  category: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14,
    ...shadow(2, 0.05, 6, 2),
  },
  categoryHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  categoryTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  categoryCount: {
    backgroundColor: '#f3f4f6', borderRadius: 999,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  categoryCountComplete: { backgroundColor: '#dcfce7' },
  categoryCountText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  categoryCountTextComplete: { color: '#16a34a' },

  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  itemLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemName: { fontSize: 14, color: '#111827', flexShrink: 1 },
  itemNameChecked: { color: '#9ca3af', textDecorationLine: 'line-through' },
  itemActions: { flexDirection: 'row', gap: 12, marginLeft: 8 },
  itemActionBtn: { padding: 2 },

  addRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 9, paddingHorizontal: 12,
    fontSize: 14, color: '#111827',
  },
  addBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#E8743B', alignItems: 'center', justifyContent: 'center',
  },

  undoStack: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, gap: 8,
  },
  undoBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111827', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    ...shadow(4, 0.2, 10, 6),
  },
  undoText: { flex: 1, color: '#fff', fontSize: 13, marginRight: 12 },
  undoBtnText: { color: '#E8743B', fontSize: 13, fontWeight: '700' },
});

export default PackingChecklistScreen;
