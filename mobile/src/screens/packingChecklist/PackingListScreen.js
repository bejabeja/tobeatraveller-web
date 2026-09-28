import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  ANALYTICS_EVENTS, deletePackingList, duplicatePackingList, getPackingListItems, getShoppingList, isNetworkError, isOnShoppingList,
  copyListName, isPackingListCapReachedError, localCalendarDay, MOVE_DOWN, MOVE_UP, moveWithinCategory, normalizeSearchText,
  packingCategories, selectAuthUser, selectMyItineraries, tripsToLinkTo, updatePackingList,
} from '@tobeatraveller/shared';
import FeatureLoadState from '../../components/FeatureLoadState';
import PackingItemFormModal from '../../components/PackingItemFormModal';
import PackingListFormModal from '../../components/PackingListFormModal';
import PackingListTripModal from '../../components/PackingListTripModal';
import { PendingChangesNotice } from '../../components/PendingChangesNotice';
import { newEntityId, runOrQueue } from '../../offline/outbox';
import { applyPendingChanges, applyPendingSupplyChanges, CHANGE_KINDS, COLLECTIONS } from '../../offline/pendingChanges';
import { useOutbox, useRefetchAfterSync } from '../../offline/useOutbox';
import { trackEvent } from '../../utils/analytics';
import { cacheGet, cacheSet, packingListItemsCacheKey, suppliesCacheKey } from '../../utils/offlineCache';
import { COLORS, shadow } from '../../utils/styles';

// No supply category maps cleanly onto every packing category, anything without
// an obvious match falls back to "other" rather than guessing wrong.
const PACKING_TO_SUPPLY_CATEGORY = { cleaning: 'cleaning', toiletries: 'hygiene' };
const UNDO_DELETE_WINDOW_MS = 5000;
// A short list is read at a glance; the search box only helps a long one.
const SEARCH_FROM_ITEMS = 15;
const DEFAULT_NEW_ITEM_CATEGORY = 'other';
const NOT_FOUND_STATUS = 404;

// Something added offline has no place in the list until it syncs: last.
const placeOf = (item) => item.position ?? Number.MAX_SAFE_INTEGER;
const byPosition = (a, b) => placeOf(a) - placeOf(b);
// Ticked things sink to the bottom, except while reordering, where the list
// shows the order it's saved in.
const byCheckedThenPosition = (a, b) => Number(a.checked) - Number(b.checked) || byPosition(a, b);

const PackingListScreen = ({ navigation, route }) => {
  const { listId } = route.params;
  const { t } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const insets = useSafeAreaInsets();
  const authUser = useSelector(selectAuthUser);
  const cacheKey = packingListItemsCacheKey(authUser?.id, listId);

  const [listName, setListName] = useState(route.params.name ?? '');
  const [listTrip, setListTrip] = useState(route.params.itinerary ?? null);
  const [choosingTrip, setChoosingTrip] = useState(false);
  const trips = tripsToLinkTo(useSelector(selectMyItineraries), localCalendarDay());
  const [serverItems, setServerItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(DEFAULT_NEW_ITEM_CATEGORY);
  const [addingToShoppingList, setAddingToShoppingList] = useState(null);
  const [restarting, setRestarting] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingDeletes, setPendingDeletes] = useState([]); // [{ item, timeoutId }]
  const [loadError, setLoadError] = useState(null);
  const [showingCached, setShowingCached] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [serverShoppingList, setServerShoppingList] = useState([]);
  const { changes } = useOutbox();

  // Items waiting out the undo window are hidden here rather than removed
  // from state, so undo also works for items that only exist in the queue.
  const items = useMemo(() => {
    const hiddenIds = new Set(pendingDeletes.map(({ item }) => item.id));
    return applyPendingChanges(serverItems, changes, COLLECTIONS.PACKING_CHECKLIST)
      .filter(item => item.listId === listId && !hiddenIds.has(item.id));
  }, [serverItems, changes, pendingDeletes, listId]);

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
      const list = await getPackingListItems(listId);
      setServerItems(list);
      setLoadError(null);
      setShowingCached(false);
      cacheSet(cacheKey, list);
    } catch (err) {
      const cached = isNetworkError(err) ? await cacheGet(cacheKey) : null;
      if (cached) {
        setServerItems(cached);
        setLoadError(null);
        setShowingCached(true);
        return;
      }
      setServerItems([]);
      setShowingCached(false);
      setLoadError(err?.status === NOT_FOUND_STATUS ? 'notFound' : 'error');
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }, [listId])
  );

  useRefetchAfterSync(fetchData);

  // Only to show what's already on it; the list works just the same without.
  // Asked again each time the screen shows, since it may have changed on the
  // shopping list meanwhile, and offline the last one loaded stands in.
  const loadShoppingList = async () => {
    try {
      setServerShoppingList(await getShoppingList());
    } catch (err) {
      const cached = isNetworkError(err) ? await cacheGet(suppliesCacheKey(authUser?.id)) : null;
      if (cached) setServerShoppingList(cached.shoppingList ?? []);
    }
  };

  useFocusEffect(useCallback(() => { loadShoppingList(); }, []));

  // What's queued for the shopping list counts too (added from here offline, say).
  const shoppingList = useMemo(
    () => applyPendingSupplyChanges({ shoppingList: serverShoppingList, inventory: [] }, changes).shoppingList,
    [serverShoppingList, changes]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const showError = (err, fallbackKey) =>
    Alert.alert(t('errors.somethingWrong'), isNetworkError(err) ? t('errors.networkError') : (err?.message || p(fallbackKey)));

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
      showError(err, 'saveError');
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
        showError(err, 'deleteError');
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
      const { queued, result } = await runOrQueue({
        collection: COLLECTIONS.SHOPPING_LIST,
        kind: CHANGE_KINDS.CREATE,
        entityId,
        payload: {
          id: entityId,
          name: item.name,
          category: PACKING_TO_SUPPLY_CATEGORY[item.category] ?? 'other',
          amount: item.quantity ?? 1,
          unit: 'units',
        },
        label: item.name,
      });
      if (!queued) setServerShoppingList(prev => [...prev, result]);
    } catch (err) {
      showError(err, 'saveError');
    } finally {
      setAddingToShoppingList(null);
    }
  };

  const updateItem = (item, payload) => runOrQueue({
    collection: COLLECTIONS.PACKING_CHECKLIST, kind: CHANGE_KINDS.UPDATE, entityId: item.id, payload, label: item.name,
  });

  const saveItem = async (edits) => {
    const item = editingItem;
    // Same check the server does, so an offline edit doesn't queue a change
    // that is bound to fail once it syncs.
    if (items.some(other => other.id !== item.id && other.category === edits.category
      && other.name.toLowerCase() === edits.name.toLowerCase())) {
      Alert.alert(t('errors.somethingWrong'), p('itemAlreadyInCategory'));
      return;
    }
    try {
      const { queued, result } = await updateItem(item, edits);
      if (!queued) setServerItems(prev => prev.map(i => i.id === result.id ? result : i));
      setEditingItem(null);
    } catch (err) {
      showError(err, 'saveError');
    }
  };

  const moveItem = async (item, direction) => {
    const moves = moveWithinCategory(items, item.id, direction);
    if (moves.length === 0) return;
    const placed = Object.fromEntries(moves.map(({ id, position }) => [id, position]));
    const previous = serverItems;
    setServerItems(prev => prev.map(i => (i.id in placed ? { ...i, position: placed[i.id] } : i)));
    try {
      await Promise.all(moves.map(({ id, position }) => updateItem(items.find(i => i.id === id), { position })));
    } catch (err) {
      setServerItems(previous);
      showError(err, 'saveError');
    }
  };

  const addItem = async () => {
    const name = newItemName.trim();
    if (!name) return;
    // Same check the server does, so an offline add doesn't queue a change
    // that is bound to fail once it syncs.
    if (items.some(item => item.category === newItemCategory && item.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert(t('errors.somethingWrong'), p('itemAlreadyInCategory'));
      return;
    }
    const entityId = newEntityId();
    try {
      const { queued, result } = await runOrQueue({
        collection: COLLECTIONS.PACKING_CHECKLIST,
        kind: CHANGE_KINDS.CREATE,
        entityId,
        payload: { id: entityId, listId, category: newItemCategory, name },
        label: name,
      });
      if (!queued) setServerItems(prev => [...prev, result]);
      setNewItemName('');
    } catch (err) {
      showError(err, 'saveError');
    }
  };

  const restart = async () => {
    setRestarting(true);
    try {
      const { queued, result } = await runOrQueue({
        collection: COLLECTIONS.PACKING_CHECKLIST, kind: CHANGE_KINDS.RESTART_LIST, entityId: listId, label: listName,
      });
      if (!queued) setServerItems(result);
    } catch (err) {
      showError(err, 'saveError');
    } finally {
      setRestarting(false);
    }
  };

  // Renaming, copying and deleting a list need the server, so they aren't
  // queued offline like ticking things off is.
  const rename = async ({ name }) => {
    try {
      const list = await updatePackingList(listId, { name });
      setListName(list.name);
      setRenaming(false);
    } catch (err) {
      showError(err, 'saveError');
    }
  };

  const linkTrip = async (itineraryId) => {
    setMenuOpen(false);
    try {
      const list = await updatePackingList(listId, { itineraryId });
      if (itineraryId) trackEvent(ANALYTICS_EVENTS.PACKING_LIST_LINKED_TO_TRIP);
      setListTrip(list.itinerary);
      setChoosingTrip(false);
    } catch (err) {
      showError(err, 'saveError');
    }
  };

  const duplicate = async () => {
    setMenuOpen(false);
    try {
      const copy = await duplicatePackingList(listId, copyListName(listName, name => p('copyName', { name })));
      navigation.replace('PackingList', { listId: copy.id, name: copy.name });
    } catch (err) {
      if (isPackingListCapReachedError(err)) setCapReached(true);
      else showError(err, 'saveError');
    }
  };

  const confirmDelete = () => {
    setMenuOpen(false);
    Alert.alert(p('deleteListTitle', { name: listName }), p('deleteListDesc'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: p('deleteList'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePackingList(listId);
            navigation.goBack();
          } catch (err) {
            showError(err, 'deleteError');
          }
        },
      },
    ]);
  };

  const seePlans = () => {
    setCapReached(false);
    navigation.navigate('Subscription');
  };

  const totalCount = items.length;
  const checkedCount = items.filter(i => i.checked).length;
  const canReorder = totalCount > 1;
  const query = normalizeSearchText(search.trim());
  const matchesQuery = (item) => !query || normalizeSearchText(item.name).includes(query);
  const visibleCategories = packingCategories
    .map(({ value }) => ({
      category: value,
      items: items.filter(i => i.category === value && matchesQuery(i)).sort(reordering ? byPosition : byCheckedThenPosition),
    }))
    .filter(({ items: categoryItems }) => categoryItems.length > 0);

  const menuOptions = [
    { key: 'rename', icon: 'create-outline', label: p('rename'), onPress: () => { setMenuOpen(false); setRenaming(true); } },
    { key: 'trip', icon: 'map-outline', label: listTrip ? p('changeTrip') : p('linkToTrip'), onPress: () => { setMenuOpen(false); setChoosingTrip(true); } },
    ...(listTrip ? [{ key: 'unlink', icon: 'unlink-outline', label: p('unlinkTrip'), onPress: () => linkTrip(null) }] : []),
    { key: 'duplicate', icon: 'copy-outline', label: p('duplicate'), onPress: duplicate },
    { key: 'delete', icon: 'trash-outline', label: p('deleteList'), onPress: confirmDelete, danger: true },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={p('allLists')}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={2}>{listName}</Text>
          {totalCount > 0 && (
            <View style={[styles.progressBadge, checkedCount === totalCount && styles.progressBadgeComplete]}>
              <Text style={[styles.progressText, checkedCount === totalCount && styles.progressTextComplete]}>
                {p('progress', { checked: checkedCount, total: totalCount })}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.moreOptions')}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {listTrip && (
          <TouchableOpacity
            style={styles.tripLink}
            onPress={() => navigation.navigate('Itinerary', { id: listTrip.id })}
            accessibilityRole="link"
          >
            <Ionicons name="map-outline" size={14} color={COLORS.primary} />
            <Text style={styles.tripLinkText} numberOfLines={1}>{p('forTrip', { title: listTrip.title })}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder={p('addItemPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={addItem}
            returnKeyType="done"
            accessibilityLabel={p('addItemPlaceholder')}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addItem} accessibilityRole="button" accessibilityLabel={p('add')}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips} keyboardShouldPersistTaps="handled">
          {packingCategories.map(({ value }) => {
            const selected = newItemCategory === value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setNewItemCategory(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{categoryLabel(value)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {(checkedCount > 0 || canReorder) && (
          <View style={styles.toolbar}>
            {totalCount >= SEARCH_FROM_ITEMS && (
              <View style={styles.searchRow}>
                <Ionicons name="search" size={15} color="#9ca3af" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={p('searchPlaceholder')}
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#9ca3af"
                  autoCorrect={false}
                  accessibilityLabel={p('searchPlaceholder')}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                    <Ionicons name="close" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {checkedCount > 0 && !reordering && (
              <TouchableOpacity style={styles.ghostBtn} onPress={restart} disabled={restarting} accessibilityRole="button">
                {restarting
                  ? <ActivityIndicator size="small" color="#6b7280" />
                  : <>
                      <Ionicons name="repeat-outline" size={15} color="#6b7280" />
                      <Text style={styles.ghostBtnText}>{p('restart')}</Text>
                    </>
                }
              </TouchableOpacity>
            )}
            {canReorder && (
              <TouchableOpacity
                style={[styles.ghostBtn, reordering && styles.ghostBtnActive]}
                onPress={() => setReordering(value => !value)}
                accessibilityRole="button"
                accessibilityState={{ selected: reordering }}
              >
                <Ionicons name="swap-vertical-outline" size={15} color={reordering ? '#fff' : '#6b7280'} />
                <Text style={[styles.ghostBtnText, reordering && styles.ghostBtnTextActive]}>{reordering ? p('reorderDone') : p('reorder')}</Text>
              </TouchableOpacity>
            )}
          </View>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : loadError === 'notFound' ? (
            // Deleted elsewhere (on the web, say): trying again wouldn't help.
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{p('listNotFound')}</Text>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
                <Text style={styles.ghostBtnText}>{p('allLists')}</Text>
              </TouchableOpacity>
            </View>
          ) : loadError ? (
            <FeatureLoadState status={loadError} onRetry={fetchData} />
          ) : totalCount === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎒</Text>
              <Text style={styles.emptyTitle}>{p('noItems')}</Text>
            </View>
          ) : visibleCategories.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{p('noSearchResults', { query: search.trim() })}</Text>
            </View>
          ) : (
            visibleCategories.map(({ category, items: categoryItems }) => (
              <View key={category} style={styles.category}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle} accessibilityRole="header">{categoryLabel(category)}</Text>
                  <View style={[styles.categoryCount, categoryItems.every(i => i.checked) && styles.categoryCountComplete]}>
                    <Text style={[styles.categoryCountText, categoryItems.every(i => i.checked) && styles.categoryCountTextComplete]}>
                      {categoryItems.filter(i => i.checked).length}/{categoryItems.length}
                    </Text>
                  </View>
                </View>

                {categoryItems.map((item, index) => (
                  <View key={item.id} style={styles.item}>
                    <TouchableOpacity
                      style={styles.itemLabel}
                      onPress={() => toggleChecked(item)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: item.checked }}
                    >
                      <Ionicons name={item.checked ? 'checkbox' : 'square-outline'} size={20} color={item.checked ? COLORS.primary : '#9ca3af'} />
                      <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>{item.name}</Text>
                      {item.quantity > 1 && <Text style={styles.itemQuantity}>{p('quantityBadge', { count: item.quantity })}</Text>}
                      {item._pending && (
                        <Ionicons
                          name={item._syncFailed ? 'alert-circle-outline' : 'cloud-upload-outline'}
                          size={14}
                          color={item._syncFailed ? '#b91c1c' : '#92400e'}
                          accessibilityLabel={item._syncFailed ? t('offline.notSynced') : t('offline.pendingSync')}
                        />
                      )}
                    </TouchableOpacity>
                    {reordering ? (
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={[styles.itemActionBtn, index === 0 && styles.itemActionBtnDisabled]}
                          onPress={() => moveItem(item, MOVE_UP)}
                          disabled={index === 0}
                          accessibilityRole="button"
                          accessibilityLabel={p('moveUp', { name: item.name })}
                        >
                          <Ionicons name="chevron-up" size={18} color="#374151" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.itemActionBtn, index === categoryItems.length - 1 && styles.itemActionBtnDisabled]}
                          onPress={() => moveItem(item, MOVE_DOWN)}
                          disabled={index === categoryItems.length - 1}
                          accessibilityRole="button"
                          accessibilityLabel={p('moveDown', { name: item.name })}
                        >
                          <Ionicons name="chevron-down" size={18} color="#374151" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.itemActions}>
                        {!item.checked && (isOnShoppingList(shoppingList, item.name) ? (
                          <View style={styles.itemActionBtn} accessible accessibilityLabel={p('onShoppingList')}>
                            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.itemActionBtn}
                            onPress={() => addToShoppingList(item)}
                            disabled={addingToShoppingList === item.id}
                            accessibilityRole="button"
                            accessibilityLabel={p('addToShoppingList')}
                          >
                            {addingToShoppingList === item.id
                              ? <ActivityIndicator size="small" color="#6b7280" />
                              : <Ionicons name="cart-outline" size={16} color="#6b7280" />
                            }
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.itemActionBtn} onPress={() => setEditingItem(item)} accessibilityRole="button" accessibilityLabel={p('editItem')}>
                          <Ionicons name="pencil-outline" size={16} color="#6b7280" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.itemActionBtn} onPress={() => removeItem(item)} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {pendingDeletes.length > 0 && (
        <View style={[styles.undoStack, { paddingBottom: insets.bottom + 12 }]}>
          {pendingDeletes.map(({ item }) => (
            <View key={item.id} style={styles.undoBanner}>
              <Text style={styles.undoText} numberOfLines={1}>{p('itemDeleted', { name: item.name })}</Text>
              <TouchableOpacity onPress={() => undoRemove(item.id)} accessibilityRole="button">
                <Text style={styles.undoBtnText}>{p('undo')}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        {/* Not a button itself: left out for screen readers, so the options stay reachable. */}
        <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuOpen(false)} accessible={false}>
          <View style={[styles.menuSheet, { paddingBottom: insets.bottom + 12 }]}>
            {menuOptions.map(({ key, icon, label, onPress, danger }) => (
              <TouchableOpacity key={key} style={styles.menuOption} onPress={onPress} accessibilityRole="button">
                <Ionicons name={icon} size={20} color={danger ? '#dc2626' : '#374151'} />
                <Text style={[styles.menuOptionText, danger && styles.menuOptionDanger]}>{label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuOpen(false)} accessibilityRole="button">
              <Text style={styles.menuCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {choosingTrip && (
        <PackingListTripModal
          trips={trips}
          currentTripId={listTrip?.id ?? null}
          onClose={() => setChoosingTrip(false)}
          onSubmit={linkTrip}
        />
      )}
      {editingItem && (
        <PackingItemFormModal
          item={editingItem}
          categoryLabel={categoryLabel}
          onClose={() => setEditingItem(null)}
          onSubmit={saveItem}
        />
      )}
      <PackingListFormModal
        key={renaming ? 'renaming' : 'idle'}
        visible={renaming}
        title={p('rename')}
        submitLabel={t('common.save')}
        initialName={listName}
        onClose={() => setRenaming(false)}
        onSubmit={rename}
      />
      <PackingListFormModal
        visible={capReached}
        title={p('duplicate')}
        capReached
        onClose={() => setCapReached(false)}
        onSubmit={() => {}}
        onSeePlans={seePlans}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  cachedBanner: { paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#fef3c7' },
  cachedBannerText: { fontSize: 12, color: '#92400e', fontWeight: '600' },

  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
    ...shadow(2, 0.05, 6, 2),
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 20, color: '#374151' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: '#111827' },
  progressBadge: { backgroundColor: '#f3f4f6', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  progressBadgeComplete: { backgroundColor: '#dcfce7' },
  progressText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  progressTextComplete: { color: '#16a34a' },
  menuBtn: { padding: 4 },
  tripLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 10, marginTop: -4 },
  tripLinkText: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: COLORS.primary },

  addRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  addInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 10, paddingHorizontal: 12,
    fontSize: 15, color: '#111827',
  },
  addBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  categoryChips: { gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: '#fff5ef' },
  chipText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  chipTextSelected: { color: COLORS.primary },

  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  searchRow: {
    flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: '#111827' },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 12,
  },
  ghostBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  ghostBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  ghostBtnTextActive: { color: '#fff' },

  scroll: { padding: 12, gap: 14 },

  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32, gap: 16 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, color: '#6b7280', textAlign: 'center' },

  category: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14,
    ...shadow(2, 0.05, 6, 2),
  },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  categoryTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  categoryCount: { backgroundColor: '#f3f4f6', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 },
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
  itemActionBtnDisabled: { opacity: 0.3 },
  itemQuantity: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  undoStack: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, gap: 8 },
  undoBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111827', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    ...shadow(4, 0.2, 10, 6),
  },
  undoText: { flex: 1, color: '#fff', fontSize: 13, marginRight: 12 },
  undoBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  menuBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  menuSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8 },
  menuOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 24 },
  menuOptionText: { fontSize: 16, color: '#111827' },
  menuOptionDanger: { color: '#dc2626' },
  menuCancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  menuCancelText: { fontSize: 15, color: '#6b7280', fontWeight: '600' },
});

export default PackingListScreen;
