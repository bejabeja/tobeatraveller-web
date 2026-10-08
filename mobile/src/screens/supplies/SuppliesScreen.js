import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, SectionList,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  findSupplyByName, formatNumber, getInventory, getShoppingList, groupSuppliesByCategory, isNetworkError, isPremiumRequiredError,
  isTimeoutError, normalizeSearchText, resolveQuickAddSupply, selectAuthUser, suggestSupplies, supplyCategories, supplyUnits,
} from '@tobeatraveller/shared';
import FeatureLoadState from '../../components/FeatureLoadState';
import { PendingChangesNotice } from '../../components/PendingChangesNotice';
import { PendingSyncBadge } from '../../components/PendingSyncBadge';
import { newEntityId, runOrQueue } from '../../offline/outbox';
import {
  applyPendingSupplyChanges, CHANGE_KINDS, COLLECTIONS, isDerivedItem,
} from '../../offline/pendingChanges';
import { useOutbox, useRefetchAfterSync } from '../../offline/useOutbox';
import { cacheGet, cacheSet, suppliesCacheKey } from '../../utils/offlineCache';
import { shadow } from '../../utils/styles';

// Buying is not final for this long: the check shows at once and the purchase
// is only sent when the window closes, so a slip in the shop can be undone.
const UNDO_PURCHASE_WINDOW_MS = 5000;
const SEARCH_FROM_ITEMS = 15;
const DEFAULT_QUICK_ADD_CATEGORY = 'food';

const CATEGORY_EMOJI = {
  food: '🍎', hygiene: '🧴', health: '💊', cleaning: '🧽', home: '🏠', vehicle: '🚗', leisure: '⛺', other: '📦',
};

const SuppliesScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const s = (key, vars) => t(`supplies.${key}`, vars);
  const insets = useSafeAreaInsets();
  // The session user rather than the full profile: it is restored even when
  // the app opens offline, so the cached data can still be found.
  const authUser = useSelector(selectAuthUser);
  const cacheKey = suppliesCacheKey(authUser?.id);

  const [tab, setTab] = useState('shopping');
  const [search, setSearch] = useState('');
  const [serverSupplies, setServerSupplies] = useState({ shoppingList: [], inventory: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quantityPrompt, setQuantityPrompt] = useState(null); // { type: 'purchase' | 'consume', item }
  const [quantityValue, setQuantityValue] = useState('');
  const [confirmingQuantity, setConfirmingQuantity] = useState(false);
  const [loadError, setLoadError] = useState(null); // null | 'premium' | 'error'
  const [showingCached, setShowingCached] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(DEFAULT_QUICK_ADD_CATEGORY);
  const [pendingPurchases, setPendingPurchases] = useState([]); // [{ item, timeoutId }]
  const [restockedName, setRestockedName] = useState(null);
  const { changes } = useOutbox();
  const { shoppingList, inventory } = useMemo(
    () => applyPendingSupplyChanges(serverSupplies, changes),
    [serverSupplies, changes]
  );

  const categoryLabel = (value) => s(`category.${value}`, value);
  // Agrees with the amount: "1 unidad", "2 unidades".
  const unitLabel = (value, amount) => s(`unit.${value}`, { count: amount, defaultValue: value });

  const fetchData = async () => {
    try {
      const [shoppingRes, inventoryRes] = await Promise.all([getShoppingList(), getInventory()]);
      const shopping = Array.isArray(shoppingRes) ? shoppingRes : [];
      const items = Array.isArray(inventoryRes) ? inventoryRes : [];
      setServerSupplies({ shoppingList: shopping, inventory: items });
      setLoadError(null);
      setShowingCached(false);
      cacheSet(cacheKey, { shoppingList: shopping, inventory: items });
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = await cacheGet(cacheKey);
        if (cached) {
          setServerSupplies({ shoppingList: cached.shoppingList ?? [], inventory: cached.inventory ?? [] });
          setLoadError(null);
          setShowingCached(true);
          return;
        }
      }
      setServerSupplies({ shoppingList: [], inventory: [] });
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

  const pendingPurchasesRef = useRef([]);
  useEffect(() => { pendingPurchasesRef.current = pendingPurchases; }, [pendingPurchases]);

  const purchaseItem = (item) => runOrQueue({
    collection: COLLECTIONS.SHOPPING_LIST,
    kind: CHANGE_KINDS.PURCHASE,
    entityId: item.id,
    payload: { amount: item.amount },
    label: item.name,
  });

  // Leaving the screen finalizes the purchases still waiting out the undo window.
  useEffect(() => () => {
    pendingPurchasesRef.current.forEach(({ item, timeoutId }) => {
      clearTimeout(timeoutId);
      purchaseItem(item).catch(() => {});
    });
  }, []);

  const restockTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(restockTimerRef.current), []);

  // The item is back on the shopping list, which is another tab: say so and
  // offer to go there instead of leaving it to be found.
  const showRestocked = (name) => {
    clearTimeout(restockTimerRef.current);
    setRestockedName(name);
    restockTimerRef.current = setTimeout(() => setRestockedName(null), UNDO_PURCHASE_WINDOW_MS);
  };

  const viewShoppingList = () => {
    clearTimeout(restockTimerRef.current);
    setRestockedName(null);
    setTab('shopping');
  };

  const startPurchase = (item) => {
    const timeoutId = setTimeout(async () => {
      try {
        const { queued } = await purchaseItem(item);
        if (!queued) fetchData();
      } catch (err) {
        if (isTimeoutError(err)) {
          // It may have gone through: reload so the list shows what the server has.
          fetchData();
          Alert.alert(t('errors.somethingWrong'), t('offline.actionUnconfirmed'));
        } else {
          Alert.alert(t('errors.somethingWrong'), err?.message || s('saveError'));
        }
      } finally {
        setPendingPurchases(prev => prev.filter(entry => entry.item.id !== item.id));
      }
    }, UNDO_PURCHASE_WINDOW_MS);
    setPendingPurchases(prev => [...prev, { item, timeoutId }]);
  };

  const undoAllPurchases = () => {
    pendingPurchasesRef.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    setPendingPurchases([]);
  };

  const undoPurchase = (itemId) => {
    const pending = pendingPurchasesRef.current.find(entry => entry.item.id === itemId);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    setPendingPurchases(prev => prev.filter(entry => entry.item.id !== itemId));
  };

  const knownItems = Object.values(
    [...inventory, ...shoppingList].reduce((byKey, current) => {
      const key = `${current.name.toLowerCase()}|${current.unit}`;
      if (!byKey[key]) byKey[key] = { name: current.name, unit: current.unit, category: current.category };
      return byKey;
    }, {})
  );

  const handleDelete = (item) => {
    Alert.alert(
      s('deleteConfirmTitle'),
      s('deleteConfirmDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { queued } = await runOrQueue({
                collection: tab === 'shopping' ? COLLECTIONS.SHOPPING_LIST : COLLECTIONS.INVENTORY,
                kind: CHANGE_KINDS.DELETE,
                entityId: item.id,
                label: item.name,
              });
              if (!queued) fetchData();
            } catch (err) {
              Alert.alert(t('errors.somethingWrong'), err?.message || s('deleteError'));
            }
          },
        },
      ]
    );
  };

  const addQuickItem = async (text) => {
    const name = text.trim();
    if (!name) return;
    const isShopping = tab === 'shopping';
    // Same check as the web, so an offline add doesn't queue a duplicate.
    if (findSupplyByName(isShopping ? shoppingList : inventory, name)) {
      Alert.alert(t('errors.somethingWrong'), s(isShopping ? 'alreadyOnList' : 'alreadyInInventory'));
      return;
    }
    const entityId = newEntityId();
    try {
      const { queued, result } = await runOrQueue({
        collection: isShopping ? COLLECTIONS.SHOPPING_LIST : COLLECTIONS.INVENTORY,
        kind: CHANGE_KINDS.CREATE,
        entityId,
        payload: { ...resolveQuickAddSupply(name, newItemCategory, knownItems), id: entityId },
        label: name,
      });
      const listKey = isShopping ? 'shoppingList' : 'inventory';
      if (!queued) setServerSupplies(prev => ({ ...prev, [listKey]: [...prev[listKey], result] }));
      setNewItemName('');
    } catch (err) {
      Alert.alert(t('errors.somethingWrong'), isNetworkError(err) ? t('errors.networkError') : (err?.message || s('saveError')));
    }
  };

  const handleItemMenu = (item) => {
    Alert.alert(item.name, undefined, [
      { text: t('common.edit'), onPress: () => navigation.navigate('SupplyForm', { listType: tab, item, existingItems: knownItems }) },
      ...(tab === 'shopping' ? [{ text: s('differentAmount'), onPress: () => openQuantityPrompt('purchase', item) }] : []),
      { text: t('common.delete'), style: 'destructive', onPress: () => handleDelete(item) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const openQuantityPrompt = (type, item) => {
    setQuantityPrompt({ type, item });
    setQuantityValue(String(item.amount));
  };

  const quantityUnitAllowsDecimals = quantityPrompt
    ? supplyUnits.find(u => u.value === quantityPrompt.item.unit)?.allowsDecimals ?? true
    : true;

  const confirmQuantityPrompt = async () => {
    const amount = parseFloat(quantityValue);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t('errors.somethingWrong'), s('invalidAmount'));
      return;
    }
    const { type, item } = quantityPrompt;
    setConfirmingQuantity(true);
    try {
      const { queued } = await runOrQueue(type === 'purchase'
        ? { collection: COLLECTIONS.SHOPPING_LIST, kind: CHANGE_KINDS.PURCHASE, entityId: item.id, payload: { amount }, label: item.name }
        : { collection: COLLECTIONS.INVENTORY, kind: CHANGE_KINDS.USE_UP, entityId: item.id, payload: { amount }, label: item.name });
      setQuantityPrompt(null);
      if (!queued) fetchData();
      if (type === 'consume' && amount >= item.amount) showRestocked(item.name);
    } catch (err) {
      if (isTimeoutError(err)) {
        // It may have gone through: reload so the list shows what the server
        // has before the user tries again.
        setQuantityPrompt(null);
        fetchData();
        Alert.alert(t('errors.somethingWrong'), t('offline.actionUnconfirmed'));
      } else {
        Alert.alert(t('errors.somethingWrong'), err?.message || s('saveError'));
      }
    } finally {
      setConfirmingQuantity(false);
    }
  };

  const tabItems = tab === 'shopping' ? shoppingList : inventory;
  const query = normalizeSearchText(search.trim());
  const items = query ? tabItems.filter(item => normalizeSearchText(item.name).includes(query)) : tabItems;
  const pendingPurchaseIds = new Set(pendingPurchases.map(({ item }) => item.id));
  const suggestions = suggestSupplies(knownItems, newItemName, tabItems);
  const quickAddPlaceholder = s(tab === 'shopping' ? 'quickAddPlaceholder' : 'quickAddInventoryPlaceholder');
  // What is already ticked drops to the bottom of its category.
  const sections = groupSuppliesByCategory(items, supplyCategories).map(({ category, items: groupItems }) => ({
    key: category,
    category,
    data: [...groupItems].sort((a, b) => Number(pendingPurchaseIds.has(a.id)) - Number(pendingPurchaseIds.has(b.id))),
  }));

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
          <Text style={styles.title}>{s('title')}</Text>
          {loadError !== 'premium' && (
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => navigation.navigate('SupplyForm', { listType: tab, existingItems: knownItems })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.newBtnText}>+ {s('addItem')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.purpose}>{s('purpose')}</Text>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'shopping' && styles.tabBtnActive]}
            onPress={() => setTab('shopping')}
          >
            <Ionicons name="cart-outline" size={15} color={tab === 'shopping' ? '#E8743B' : '#6b7280'} />
            <Text style={[styles.tabText, tab === 'shopping' && styles.tabTextActive]}>{s('shoppingListTab')}</Text>
            {shoppingList.length > 0 && (
              <View style={styles.tabCount}><Text style={styles.tabCountText}>{shoppingList.length}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'inventory' && styles.tabBtnActive]}
            onPress={() => setTab('inventory')}
          >
            <Ionicons name="file-tray-stacked-outline" size={15} color={tab === 'inventory' ? '#E8743B' : '#6b7280'} />
            <Text style={[styles.tabText, tab === 'inventory' && styles.tabTextActive]}>{s('inventoryTab')}</Text>
            {inventory.length > 0 && (
              <View style={styles.tabCount}><Text style={styles.tabCountText}>{inventory.length}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        {tabItems.length >= SEARCH_FROM_ITEMS && (
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={s('searchPlaceholder')}
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
        )}

        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder={quickAddPlaceholder}
            placeholderTextColor="#9ca3af"
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={() => addQuickItem(newItemName)}
            returnKeyType="done"
            accessibilityLabel={quickAddPlaceholder}
          />
          <TouchableOpacity style={styles.addBtn} onPress={() => addQuickItem(newItemName)} accessibilityRole="button" accessibilityLabel={s('add')}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <TouchableOpacity
                key={`${suggestion.name}-${suggestion.unit}`}
                style={styles.suggestion}
                onPress={() => addQuickItem(suggestion.name)}
                accessibilityRole="button"
              >
                <Text style={styles.suggestionName}>{suggestion.name}</Text>
                <Text style={styles.suggestionMeta} numberOfLines={1}>
                  {categoryLabel(suggestion.category)} · {unitLabel(suggestion.unit, 1)}
                </Text>
                <Ionicons name="add" size={18} color="#E8743B" />
              </TouchableOpacity>
            ))}
          </View>
        )}
        {newItemName.trim().length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips} keyboardShouldPersistTaps="handled">
            {supplyCategories.map(({ value }) => {
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
        )}
      </View>

      <PendingChangesNotice />
      {showingCached && (
        <View style={styles.cachedBanner}>
          <Text style={styles.cachedBannerText}>{t('common.showingCachedData')}</Text>
        </View>
      )}

      <SectionList showsHorizontalScrollIndicator={false}
        sections={loading && !items.length
          ? [{ key: 'skeleton', category: null, data: Array.from({ length: 4 }, (_, i) => ({ id: `sk-${i}`, _skeleton: true })) }]
          : sections
        }
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (pendingPurchases.length > 0 || restockedName ? 96 : 24) }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E8743B" />
        }
        renderSectionHeader={({ section }) => section.category ? (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderLabel}>{CATEGORY_EMOJI[section.category] ?? '📦'} {categoryLabel(section.category)}</Text>
            <View style={styles.sectionCount}><Text style={styles.sectionCountText}>{section.data.length}</Text></View>
          </View>
        ) : null}
        ListEmptyComponent={
          !loading ? (
            loadError ? (
              <FeatureLoadState status={loadError} onRetry={fetchData} />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>{tab === 'shopping' ? '🛒' : '📦'}</Text>
                <Text style={styles.emptyTitle}>
                  {query ? s('noSearchResults', { query: search.trim() }) : s(tab === 'shopping' ? 'noShoppingItems' : 'noInventoryItems')}
                </Text>
              </View>
            )
          ) : null
        }
        renderItem={({ item, index, section }) => {
          const rowStyle = [
            styles.row,
            index === 0 && styles.rowFirst,
            index === section.data.length - 1 && styles.rowLast,
          ];
          if (item._skeleton) return <View style={[...rowStyle, styles.rowSkeleton]} />;

          const isPending = pendingPurchaseIds.has(item.id);
          // An item a queued purchase/use-up will create has no server id
          // to act on until that change syncs.
          const canAct = !isDerivedItem(item);
          const text = (
            <View style={styles.rowText}>
              <Text style={[styles.rowName, isPending && styles.rowChecked]}>{item.name}</Text>
              {item.notes ? <Text style={styles.rowNotes} numberOfLines={2}>{item.notes}</Text> : null}
              <PendingSyncBadge item={item} />
            </View>
          );
          return (
            <View style={rowStyle}>
              {tab === 'shopping' && canAct ? (
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => (isPending ? undoPurchase(item.id) : startPurchase(item))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isPending }}
                  accessibilityLabel={`${s('markPurchased')}: ${item.name}`}
                >
                  <Ionicons name={isPending ? 'checkbox' : 'square-outline'} size={22} color={isPending ? '#E8743B' : '#9ca3af'} />
                  {text}
                </TouchableOpacity>
              ) : (
                <View style={styles.rowMain}>{text}</View>
              )}
              <Text style={[styles.rowAmount, isPending && styles.rowChecked]}>
                {formatNumber(item.amount, i18n.language)} {unitLabel(item.unit, item.amount)}
              </Text>
              {canAct && tab === 'inventory' && (
                <TouchableOpacity style={styles.useBtn} onPress={() => openQuantityPrompt('consume', item)} accessibilityRole="button">
                  <Text style={styles.useBtnText}>{s('useItem')}</Text>
                </TouchableOpacity>
              )}
              {canAct && !isPending && (
                <TouchableOpacity
                  style={styles.menuBtn}
                  onPress={() => handleItemMenu(item)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.moreOptions')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {(pendingPurchases.length > 0 || restockedName) && (
        <View style={[styles.undoStack, { paddingBottom: insets.bottom + 12 }]}>
          {pendingPurchases.length > 0 && (
            // One banner for all the purchases waiting out the undo window: ticking
            // a whole shop in a row would otherwise stack one per product over the list.
            <View style={styles.undoBanner}>
              <Text style={styles.undoText} numberOfLines={1}>
                {pendingPurchases.length === 1
                  ? s('movedToInventory', { name: pendingPurchases[0].item.name })
                  : s('purchasedCount', { count: pendingPurchases.length })}
              </Text>
              <TouchableOpacity onPress={undoAllPurchases} accessibilityRole="button">
                <Text style={styles.undoBtnText}>{s('undo')}</Text>
              </TouchableOpacity>
            </View>
          )}
          {restockedName && (
            <View style={styles.undoBanner}>
              <Text style={styles.undoText} numberOfLines={1}>{s('movedToShoppingList', { name: restockedName })}</Text>
              <TouchableOpacity onPress={viewShoppingList} accessibilityRole="button">
                <Text style={styles.undoBtnText}>{s('viewList')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <Modal visible={!!quantityPrompt} transparent animationType="fade" onRequestClose={() => setQuantityPrompt(null)}>
        <TouchableOpacity style={styles.promptBackdrop} activeOpacity={1} onPress={() => setQuantityPrompt(null)} accessible={false}>
          {quantityPrompt && (
            <TouchableOpacity style={styles.promptPanel} activeOpacity={1} onPress={() => {}} accessible={false}>
              <Text style={styles.promptTitle}>
                {s(quantityPrompt.type === 'purchase' ? 'purchaseTitle' : 'consumeTitle', { name: quantityPrompt.item.name })}
              </Text>
              <Text style={styles.promptHint}>
                {s(quantityPrompt.type === 'purchase' ? 'purchaseHint' : 'consumeHint', {
                  amount: formatNumber(quantityPrompt.item.amount, i18n.language), unit: unitLabel(quantityPrompt.item.unit, quantityPrompt.item.amount),
                })}
              </Text>
              <Text style={styles.promptLabel}>{s('amountLabel')}</Text>
              <TextInput
                style={styles.promptInput}
                value={quantityValue}
                onChangeText={setQuantityValue}
                keyboardType={quantityUnitAllowsDecimals ? 'decimal-pad' : 'number-pad'}
                autoFocus
              />
              <View style={styles.promptActions}>
                <TouchableOpacity style={styles.promptCancelBtn} onPress={() => setQuantityPrompt(null)}>
                  <Text style={styles.promptCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.promptConfirmBtn, confirmingQuantity && styles.promptConfirmBtnDisabled]}
                  onPress={confirmQuantityPrompt}
                  disabled={confirmingQuantity}
                >
                  {confirmingQuantity
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.promptConfirmText}>
                        {s(quantityPrompt.type === 'purchase' ? 'confirmPurchase' : 'confirmConsume')}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
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
  purpose: { fontSize: 13, color: '#6b7280', paddingHorizontal: 16, paddingBottom: 12 },
  newBtn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tabBtnActive: { borderColor: '#E8743B', backgroundColor: '#FFF0E8' },
  tabText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: '#E8743B' },
  tabCount: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 1, paddingHorizontal: 6, minWidth: 18, alignItems: 'center',
  },
  tabCountText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16,
    backgroundColor: '#f3f4f6', borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },
  clearText: { color: '#9ca3af', fontSize: 13, padding: 4 },

  addRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  addInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 10, paddingHorizontal: 12,
    fontSize: 15, color: '#111827',
  },
  addBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: '#E8743B', alignItems: 'center', justifyContent: 'center',
  },
  categoryChips: { gap: 6, paddingHorizontal: 16, paddingTop: 6 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  chipSelected: { borderColor: '#E8743B', backgroundColor: '#fff5ef' },
  chipText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  chipTextSelected: { color: '#E8743B' },

  suggestions: {
    marginHorizontal: 16, marginTop: 6,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12 },
  suggestionName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  suggestionMeta: { flex: 1, fontSize: 12, color: '#6b7280' },

  list: { padding: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingTop: 14, paddingBottom: 8 },
  sectionHeaderLabel: {
    fontSize: 12, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  sectionCount: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingVertical: 1, paddingHorizontal: 7 },
  sectionCountText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },

  // Rows of one card per category, separated by hairlines, as in the expenses list.
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e5e7eb',
  },
  rowFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  rowLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderBottomWidth: 1 },
  rowSkeleton: { height: 52, backgroundColor: '#f3f4f6' },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rowNotes: { fontSize: 12, color: '#6b7280' },
  rowAmount: { fontSize: 13, color: '#6b7280' },
  rowChecked: { color: '#9ca3af', textDecorationLine: 'line-through' },
  useBtn: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999,
    paddingVertical: 4, paddingHorizontal: 12,
  },
  useBtnText: { fontSize: 12, fontWeight: '600', color: '#E8743B' },
  menuBtn: { padding: 2 },

  undoStack: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, gap: 8 },
  undoBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111827', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    ...shadow(4, 0.2, 10, 6),
  },
  undoText: { flex: 1, color: '#fff', fontSize: 13, marginRight: 12 },
  undoBtnText: { color: '#E8743B', fontSize: 13, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, color: '#6b7280', textAlign: 'center' },

  promptBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  promptPanel: {
    width: '100%', maxWidth: 360,
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    ...shadow(6, 0.15, 20, 8),
  },
  promptTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 6 },
  promptHint: { fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 19 },
  promptLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  promptInput: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 11, paddingHorizontal: 13,
    fontSize: 16, color: '#111827', marginBottom: 18,
  },
  promptActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  promptCancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  promptCancelText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  promptConfirmBtn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 10, paddingHorizontal: 20,
    minWidth: 84, alignItems: 'center',
  },
  promptConfirmBtnDisabled: { opacity: 0.6 },
  promptConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default SuppliesScreen;
