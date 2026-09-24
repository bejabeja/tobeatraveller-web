import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  getInventory, getShoppingList, isNetworkError, isPremiumRequiredError, normalizeSearchText,
  selectMe, supplyUnits,
} from '@tobeatraveller/shared';
import FeatureLoadState from '../../components/FeatureLoadState';
import { PendingChangesNotice } from '../../components/PendingChangesNotice';
import { PendingSyncBadge } from '../../components/PendingSyncBadge';
import { runOrQueue } from '../../offline/outbox';
import {
  applyPendingSupplyChanges, CHANGE_KINDS, COLLECTIONS, isDerivedItem,
} from '../../offline/pendingChanges';
import { useOutbox, useRefetchAfterSync } from '../../offline/useOutbox';
import { cacheGet, cacheSet } from '../../utils/offlineCache';
import { shadow } from '../../utils/styles';

const CATEGORY_EMOJI = { food: '🍎', hygiene: '🧴', cleaning: '🧽', vehicle: '🚗', other: '📦' };

const SuppliesScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const s = (key, vars) => t(`supplies.${key}`, vars);
  const insets = useSafeAreaInsets();
  const me = useSelector(selectMe);
  const cacheKey = `supplies:${me?.id}`;

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
  const { changes } = useOutbox();
  const { shoppingList, inventory } = useMemo(
    () => applyPendingSupplyChanges(serverSupplies, changes),
    [serverSupplies, changes]
  );

  const categoryLabel = (value) => s(`category.${value}`, value);
  const unitLabel = (value) => s(`unit.${value}`, value);

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
    } catch (err) {
      Alert.alert(t('errors.somethingWrong'), err?.message || s('saveError'));
    } finally {
      setConfirmingQuantity(false);
    }
  };

  const tabItems = tab === 'shopping' ? shoppingList : inventory;
  const query = normalizeSearchText(search.trim());
  const items = query ? tabItems.filter(item => normalizeSearchText(item.name).includes(query)) : tabItems;
  const hasAnyItems = shoppingList.length > 0 || inventory.length > 0;

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

        {hasAnyItems && (
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
      </View>

      <PendingChangesNotice />
      {showingCached && (
        <View style={styles.cachedBanner}>
          <Text style={styles.cachedBannerText}>{t('common.showingCachedData')}</Text>
        </View>
      )}

      <FlatList
        data={loading && !items.length
          ? Array.from({ length: 4 }, (_, i) => ({ id: `sk-${i}`, _skeleton: true }))
          : items
        }
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E8743B" />
        }
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
        renderItem={({ item }) => item._skeleton ? (
          <View style={[styles.item, styles.itemSkeleton]} />
        ) : (
          <View style={styles.item}>
            <View style={styles.itemMain}>
              <View style={styles.itemTopRow}>
                <Text style={styles.itemCategory}>{CATEGORY_EMOJI[item.category] ?? '📦'} {categoryLabel(item.category)}</Text>
              </View>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemAmount}>{item.amount} {unitLabel(item.unit)}</Text>
              {item.notes ? <Text style={styles.itemNotes} numberOfLines={2}>{item.notes}</Text> : null}
              <PendingSyncBadge item={item} />
            </View>
            {/* An item a queued purchase/use-up will create has no server id
                to act on until that change syncs. */}
            {!isDerivedItem(item) && <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.itemActionBtn}
                onPress={() => openQuantityPrompt(tab === 'shopping' ? 'purchase' : 'consume', item)}
              >
                <Ionicons
                  name={tab === 'shopping' ? 'bag-check-outline' : 'refresh-outline'}
                  size={17}
                  color="#E8743B"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.itemActionBtn}
                onPress={() => navigation.navigate('SupplyForm', {
                  listType: tab, item, existingItems: knownItems,
                })}
              >
                <Ionicons name="pencil-outline" size={16} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.itemActionBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>}
          </View>
        )}
      />

      <Modal visible={!!quantityPrompt} transparent animationType="fade" onRequestClose={() => setQuantityPrompt(null)}>
        <TouchableOpacity style={styles.promptBackdrop} activeOpacity={1} onPress={() => setQuantityPrompt(null)}>
          {quantityPrompt && (
            <TouchableOpacity style={styles.promptPanel} activeOpacity={1} onPress={() => {}}>
              <Text style={styles.promptTitle}>
                {s(quantityPrompt.type === 'purchase' ? 'purchaseTitle' : 'consumeTitle', { name: quantityPrompt.item.name })}
              </Text>
              <Text style={styles.promptHint}>
                {s(quantityPrompt.type === 'purchase' ? 'purchaseHint' : 'consumeHint', {
                  amount: quantityPrompt.item.amount, unit: unitLabel(quantityPrompt.item.unit),
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

  list: { padding: 12, gap: 10 },

  item: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 12, gap: 10,
  },
  itemSkeleton: { height: 72, backgroundColor: '#f3f4f6', borderColor: '#f3f4f6' },
  itemMain: { flex: 1 },
  itemTopRow: { flexDirection: 'row' },
  itemCategory: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  itemName: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 },
  itemAmount: { fontSize: 13, color: '#374151', marginTop: 2 },
  itemNotes: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  itemActions: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemActionBtn: { padding: 2 },

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
