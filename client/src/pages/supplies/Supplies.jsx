import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  IoAddOutline, IoBagCheckOutline, IoCartOutline, IoCloseOutline, IoCubeOutline, IoPencilOutline, IoRefreshOutline, IoSearchOutline, IoTrashOutline,
} from "react-icons/io5";
import {
  findSupplyByName, formatNumber, groupSuppliesByCategory, isInventoryCapReachedError, isPremiumRequiredError, isShoppingListCapReachedError, normalizeSearchText,
  resolveQuickAddSupply, suggestSupplies, supplyCategories, supplyUnits,
} from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import TripActionsMenu from "../../components/itineraries/TripActionsMenu";
import Modal from "../../components/modal/Modal";
import {
  addInventoryItem, addShoppingListItem, deleteInventoryItem, deleteShoppingListItem, getInventory, getShoppingList,
  getSuppliesUsage, markInventoryItemUsedUp, markShoppingListItemPurchased, updateInventoryItem, updateShoppingListItem,
} from "../../services/supplies";
import SupplyFormModal from "./SupplyFormModal";
import ToolHeader from "../../components/toolPage/ToolHeader";
import ToolEmptyState from "../../components/toolPage/ToolEmptyState";
import { usePageMeta } from "../../hooks/usePageMeta.js";
import "./Supplies.scss";

// Buying is not final for this long: the check is shown at once and the
// purchase is only sent when the window closes, so a slip in the shop can be
// undone (moving an item to the inventory has no server-side way back).
const UNDO_PURCHASE_WINDOW_MS = 5000;
const SEARCH_FROM_ITEMS = 15;
const PURCHASE_UNDO_TOAST_ID = "purchase-undo";
const DEFAULT_QUICK_ADD_CATEGORY = "food";

const Supplies = () => {
  const { t, i18n } = useTranslation();
  usePageMeta({ title: t("nav.supplies") });
  const s = (key, vars) => t(`supplies.${key}`, vars);
  // Agrees with the amount: "1 unidad", "2 unidades".
  const unitLabel = (value, amount) => s(`unit.${value}`, { count: amount, defaultValue: value });

  const [tab, setTab] = useState("shopping");
  const [search, setSearch] = useState("");
  const [shoppingList, setShoppingList] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formTarget, setFormTarget] = useState(null); // { mode: 'add-shopping' | 'add-inventory' | 'edit-shopping' | 'edit-inventory', item?, capReached? }
  const [deleteTarget, setDeleteTarget] = useState(null); // { mode, id }
  const [deleting, setDeleting] = useState(false);
  const [quantityPrompt, setQuantityPrompt] = useState(null); // { type: 'purchase' | 'consume', item }
  const [quantityValue, setQuantityValue] = useState("");
  const [confirmingQuantity, setConfirmingQuantity] = useState(false);
  const [freeTierUsage, setFreeTierUsage] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState(DEFAULT_QUICK_ADD_CATEGORY);
  const [addingItem, setAddingItem] = useState(false);
  const [pendingPurchaseIds, setPendingPurchaseIds] = useState(() => new Set());
  const pendingPurchases = useRef({});
  const addInputRef = useRef(null);

  const loadData = ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    Promise.all([getShoppingList(), getInventory()])
      .then(([shoppingRes, inventoryRes]) => {
        setShoppingList(shoppingRes);
        setInventory(inventoryRes);
        setError(null);
      })
      .catch((err) => setError(isPremiumRequiredError(err) ? "premium" : "error"))
      .finally(() => setLoading(false));
  };

  const loadUsage = () => {
    getSuppliesUsage().then(setFreeTierUsage).catch(() => {});
  };

  useEffect(() => { loadData(); loadUsage(); }, []);

  // A pending purchase's timer is not cancelled by React on unmount, so it
  // would finish against a page nobody sees. Leaving the page finalizes the
  // purchases still waiting instead.
  useEffect(() => () => {
    Object.values(pendingPurchases.current).forEach(({ item, timeoutId }) => {
      clearTimeout(timeoutId);
      markShoppingListItemPurchased(item.id).catch(() => toast.error(s("saveError")));
    });
    toast.dismiss(PURCHASE_UNDO_TOAST_ID);
  }, []);

  const openAddItem = () => setFormTarget({ mode: tab === "shopping" ? "add-shopping" : "add-inventory" });

  // The active tab's own usage, since each list has its own independent cap.
  const currentListUsage = tab === "shopping" ? freeTierUsage?.shoppingList : freeTierUsage?.inventory;
  const atCurrentListCap = !!currentListUsage?.limited && currentListUsage.used >= currentListUsage.limit;

  const categoryLabel = (value) => {
    const fallback = supplyCategories.find(c => c.value === value)?.label ?? value;
    return s(`category.${value}`, fallback);
  };

  const closeForm = () => setFormTarget(null);

  const handleSave = async (data) => {
    if (formTarget.mode === "add-shopping") {
      await addShoppingListItem(data);
      toast.success(s("added"));
    } else if (formTarget.mode === "add-inventory") {
      await addInventoryItem(data);
      toast.success(s("added"));
    } else if (formTarget.mode === "edit-shopping") {
      await updateShoppingListItem(formTarget.item.id, data);
      toast.success(s("updated"));
    } else {
      await updateInventoryItem(formTarget.item.id, data);
      toast.success(s("updated"));
    }
    closeForm();
    loadData();
    loadUsage();
  };

  // The item is back on the shopping list, which is another tab: say so and
  // offer to go there instead of leaving it to be found.
  const showRestockedToast = (item) => {
    const toastId = `restock-${item.id}`;
    toast.custom(
      () => (
        <div className="supplies__undo-toast">
          <span>{s("movedToShoppingList", { name: item.name })}</span>
          <button
            type="button"
            className="supplies__undo-btn"
            onClick={() => { setTab("shopping"); toast.dismiss(toastId); }}
          >
            {s("viewList")}
          </button>
        </div>
      ),
      { id: toastId, duration: UNDO_PURCHASE_WINDOW_MS }
    );
  };

  const openQuantityPrompt = (type, item) => {
    setQuantityPrompt({ type, item });
    setQuantityValue(String(item.amount));
  };

  const confirmQuantityPrompt = async () => {
    const amount = parseFloat(quantityValue);
    if (isNaN(amount) || amount <= 0) {
      toast.error(s("invalidAmount"));
      return;
    }
    const { type, item } = quantityPrompt;
    setConfirmingQuantity(true);
    try {
      if (type === "purchase") {
        await markShoppingListItemPurchased(item.id, amount);
        toast.success(s("movedToInventory", { name: item.name }));
      } else {
        await markInventoryItemUsedUp(item.id, amount);
        if (amount < item.amount) toast.success(s("amountUpdated", { name: item.name }));
        else showRestockedToast(item);
      }
      setQuantityPrompt(null);
      loadData();
      loadUsage();
    } catch (err) {
      toast.error(err.message || s("saveError"));
    } finally {
      setConfirmingQuantity(false);
    }
  };

  const quantityUnitAllowsDecimals = quantityPrompt
    ? supplyUnits.find(u => u.value === quantityPrompt.item.unit)?.allowsDecimals ?? true
    : true;
  const quantityStep = quantityUnitAllowsDecimals ? "0.01" : "1";

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteTarget.mode === "shopping") await deleteShoppingListItem(deleteTarget.id);
      else await deleteInventoryItem(deleteTarget.id);
      toast.success(s("deleted"));
      setDeleteTarget(null);
      loadData();
      loadUsage();
    } catch (err) {
      toast.error(err.message || s("deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const setPurchasePending = (itemId, isPending) => setPendingPurchaseIds((prev) => {
    const next = new Set(prev);
    if (isPending) next.add(itemId); else next.delete(itemId);
    return next;
  });

  // One notice for all the purchases waiting out the undo window, not one per
  // product: ticking a whole shop in a row would otherwise pile up a toast for
  // each. It says how many are pending and undoes them together.
  const syncPurchaseToast = () => {
    const pending = Object.values(pendingPurchases.current).map(({ item }) => item);
    if (pending.length === 0) {
      toast.dismiss(PURCHASE_UNDO_TOAST_ID);
      return;
    }
    toast.custom(
      () => (
        <div className="supplies__undo-toast">
          <span>
            {pending.length === 1
              ? s("movedToInventory", { name: pending[0].name })
              : s("purchasedCount", { count: pending.length })}
          </span>
          <button type="button" className="supplies__undo-btn" onClick={undoAllPurchases}>
            {s("undo")}
          </button>
        </div>
      ),
      { id: PURCHASE_UNDO_TOAST_ID, duration: Infinity }
    );
  };

  const commitPurchase = async (item) => {
    delete pendingPurchases.current[item.id];
    syncPurchaseToast();
    try {
      await markShoppingListItemPurchased(item.id);
      setShoppingList((prev) => prev.filter((candidate) => candidate.id !== item.id));
      loadData({ silent: true });
      loadUsage();
    } catch (err) {
      toast.error(err.message || s("saveError"));
    } finally {
      setPurchasePending(item.id, false);
    }
  };

  const undoPurchase = (item) => {
    const pending = pendingPurchases.current[item.id];
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    delete pendingPurchases.current[item.id];
    setPurchasePending(item.id, false);
    syncPurchaseToast();
  };

  const undoAllPurchases = () => {
    Object.values(pendingPurchases.current).forEach(({ item }) => undoPurchase(item));
  };

  const startPurchase = (item) => {
    setPurchasePending(item.id, true);
    pendingPurchases.current[item.id] = {
      item,
      timeoutId: setTimeout(() => commitPurchase(item), UNDO_PURCHASE_WINDOW_MS),
    };
    syncPurchaseToast();
  };

  const knownItems = Object.values(
    [...inventory, ...shoppingList].reduce((byKey, current) => {
      const key = `${current.name.toLowerCase()}|${current.unit}`;
      if (!byKey[key]) byKey[key] = { name: current.name, unit: current.unit, category: current.category };
      return byKey;
    }, {})
  );

  const addQuickItem = async (text) => {
    const name = text.trim();
    if (!name) return;
    if (atCurrentListCap) {
      openAddItem();
      return;
    }
    const isShopping = tab === "shopping";
    if (findSupplyByName(isShopping ? shoppingList : inventory, name)) {
      toast.error(s(isShopping ? "alreadyOnList" : "alreadyInInventory"));
      return;
    }
    setAddingItem(true);
    try {
      const item = resolveQuickAddSupply(name, newItemCategory, knownItems);
      const created = isShopping ? await addShoppingListItem(item) : await addInventoryItem(item);
      (isShopping ? setShoppingList : setInventory)((prev) => [...prev, created]);
      setNewItemName("");
      loadUsage();
    } catch (err) {
      const isCapReached = isShopping ? isShoppingListCapReachedError(err) : isInventoryCapReachedError(err);
      if (isCapReached) setFormTarget({ mode: isShopping ? "add-shopping" : "add-inventory", capReached: true });
      else toast.error(err.message || s("saveError"));
    } finally {
      setAddingItem(false);
    }
  };

  if (error) {
    return (
      <section className="section__container">
        <FeatureLoadState status={error} feature="supplies" onRetry={loadData} />
      </section>
    );
  }

  const tabItems = tab === "shopping" ? shoppingList : inventory;
  const suggestions = suggestSupplies(knownItems, newItemName, tabItems);
  const quickAddPlaceholder = s(tab === "shopping" ? "quickAddPlaceholder" : "quickAddInventoryPlaceholder");
  const query = normalizeSearchText(search.trim());
  const items = query ? tabItems.filter(item => normalizeSearchText(item.name).includes(query)) : tabItems;
  // What is already ticked drops to the bottom of its category.
  const groups = groupSuppliesByCategory(items, supplyCategories).map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => Number(pendingPurchaseIds.has(a.id)) - Number(pendingPurchaseIds.has(b.id))),
  }));

  const renderMenu = (item) => (
    <TripActionsMenu
      toggleClassName="supplies__row-menu-btn"
      items={[
        { key: "edit", label: t("common.edit"), Icon: IoPencilOutline, onSelect: () => setFormTarget({ mode: tab === "shopping" ? "edit-shopping" : "edit-inventory", item }) },
        ...(tab === "shopping"
          ? [{ key: "amount", label: s("differentAmount"), Icon: IoBagCheckOutline, onSelect: () => openQuantityPrompt("purchase", item) }]
          : []),
        { key: "delete", label: t("common.delete"), Icon: IoTrashOutline, onSelect: () => setDeleteTarget({ mode: tab, id: item.id }), danger: true },
      ]}
    />
  );

  return (
    <section className="supplies section__container">
      <ToolHeader
        title={s("title")}
        description={s("purpose")}
        usage={currentListUsage}
        usageLabel={currentListUsage && s("freeTierUsage", { used: currentListUsage.used, limit: currentListUsage.limit })}
        actionLabel={s("addItem")}
        ActionIcon={IoAddOutline}
        onAction={openAddItem}
      />

      <div className="supplies__tabs">
        <button
          type="button"
          className={`supplies__tab ${tab === "shopping" ? "supplies__tab--active" : ""}`}
          onClick={() => setTab("shopping")}
        >
          <IoCartOutline /> {s("shoppingListTab")}
          {shoppingList.length > 0 && <span className="supplies__tab-count">{shoppingList.length}</span>}
        </button>
        <button
          type="button"
          className={`supplies__tab ${tab === "inventory" ? "supplies__tab--active" : ""}`}
          onClick={() => setTab("inventory")}
        >
          <IoBagCheckOutline /> {s("inventoryTab")}
          {inventory.length > 0 && <span className="supplies__tab-count">{inventory.length}</span>}
        </button>
      </div>

      <div className="supplies__add">
        <form className="supplies__add-row" onSubmit={(event) => { event.preventDefault(); addQuickItem(newItemName); }}>
          <input
            ref={addInputRef}
            type="text"
            className="supplies__add-input"
            placeholder={quickAddPlaceholder}
            aria-label={quickAddPlaceholder}
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
            maxLength={255}
          />
          <button type="submit" className="supplies__add-btn" aria-label={s("add")} disabled={addingItem}>
            <IoAddOutline />
          </button>
        </form>

        {newItemName.trim() && (
          <div className="supplies__cat-chips" role="group" aria-label={s("categoryLabel")}>
            {supplyCategories.map(({ value }) => (
              <button
                key={value}
                type="button"
                className={`supplies__cat-chip${newItemCategory === value ? " supplies__cat-chip--active" : ""}`}
                aria-pressed={newItemCategory === value}
                // Back to the field, so Enter still adds the product after choosing.
                onClick={() => { setNewItemCategory(value); addInputRef.current?.focus(); }}
              >
                {categoryLabel(value)}
              </button>
            ))}
          </div>
        )}

        {suggestions.length > 0 && (
          <ul className="supplies__suggestions" aria-label={quickAddPlaceholder}>
            {suggestions.map((suggestion) => (
              <li key={`${suggestion.name}-${suggestion.unit}`}>
                <button
                  type="button"
                  className="supplies__suggestion"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => addQuickItem(suggestion.name)}
                >
                  <strong>{suggestion.name}</strong>
                  <small>{categoryLabel(suggestion.category)} · {unitLabel(suggestion.unit, 1)}</small>
                  <IoAddOutline aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {tabItems.length >= SEARCH_FROM_ITEMS && (
        <div className="supplies__search">
          <IoSearchOutline className="supplies__search-icon" />
          <input
            type="text"
            className="supplies__search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={s("searchPlaceholder")}
            aria-label={s("searchPlaceholder")}
          />
          {search && (
            <button type="button" className="supplies__search-clear" onClick={() => setSearch("")} aria-label={t("common.close")}>
              <IoCloseOutline />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="supplies__groups">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton supplies__group-skeleton" />
          ))}
        </div>
      ) : items.length === 0 && query ? (
        <div className="supplies__empty">
          <p>{s("noSearchResults", { query: search.trim() })}</p>
        </div>
      ) : items.length === 0 ? (
        tab === "shopping" ? (
          <div className="supplies__empty"><p>{s("noShoppingItems")}</p></div>
        ) : (
          <ToolEmptyState Icon={IoCubeOutline} text={s("noInventoryItems")} actionLabel={s("addItem")} onAction={openAddItem} />
        )
      ) : (
        <div className="supplies__groups">
          {groups.map(({ category, items: groupItems }) => (
            <div key={category} className="supplies__group">
              <h2 className="supplies__group-title">
                {categoryLabel(category)}
                <span className="supplies__group-count">{groupItems.length}</span>
              </h2>
              <div className="supplies__rows">
                {groupItems.map((item) => {
                  const isPending = pendingPurchaseIds.has(item.id);
                  const amountLabel = `${formatNumber(item.amount, i18n.language)} ${unitLabel(item.unit, item.amount)}`;
                  const text = (
                    <span className="supplies__row-text">
                      <span className="supplies__row-name">{item.name}</span>
                      {item.notes && <small className="supplies__row-notes">{item.notes}</small>}
                    </span>
                  );
                  return (
                    <div key={item.id} className={`supplies__row${isPending ? " supplies__row--checked" : ""}`}>
                      {tab === "shopping" ? (
                        <label className="supplies__row-label">
                          <input
                            type="checkbox"
                            checked={isPending}
                            onChange={() => (isPending ? undoPurchase(item) : startPurchase(item))}
                            aria-label={s("markPurchased")}
                          />
                          {text}
                        </label>
                      ) : (
                        <div className="supplies__row-label">{text}</div>
                      )}
                      <span className="supplies__row-amount">{amountLabel}</span>
                      {tab === "inventory" && (
                        <button
                          type="button"
                          className="supplies__use-btn"
                          onClick={() => openQuantityPrompt("consume", item)}
                          title={s("markUsedUp")}
                        >
                          <IoRefreshOutline aria-hidden="true" /> {s("useItem")}
                        </button>
                      )}
                      {!isPending && renderMenu(item)}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {formTarget && (
        <SupplyFormModal
          item={formTarget.item}
          title={formTarget.mode.startsWith("add") ? s("addItem") : s("editItem")}
          saveLabel={formTarget.mode.startsWith("add") ? s("addItem") : t("common.save")}
          existingItems={knownItems}
          listType={formTarget.mode.includes("shopping") ? "shopping" : "inventory"}
          initialCapReached={formTarget.mode.startsWith("add") && (atCurrentListCap || Boolean(formTarget.capReached))}
          onClose={closeForm}
          onSave={handleSave}
        />
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={s("deleteConfirmTitle")}
        description={s("deleteConfirmDesc")}
        type="danger"
        loading={deleting}
      />

      {quantityPrompt && (
        <div className="supplies__purchase-backdrop" onClick={() => setQuantityPrompt(null)}>
          <div className="supplies__purchase-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2>
              {s(quantityPrompt.type === "purchase" ? "purchaseTitle" : "consumeTitle", { name: quantityPrompt.item.name })}
            </h2>
            <p className="supplies__purchase-hint">
              {s(quantityPrompt.type === "purchase" ? "purchaseHint" : "consumeHint", {
                amount: formatNumber(quantityPrompt.item.amount, i18n.language), unit: unitLabel(quantityPrompt.item.unit, quantityPrompt.item.amount),
              })}
            </p>
            <label htmlFor="quantity-prompt-amount" className="input__label">{s("amountLabel")}</label>
            <input
              id="quantity-prompt-amount"
              type="number"
              className="input__field"
              value={quantityValue}
              onChange={(e) => setQuantityValue(e.target.value)}
              step={quantityStep}
              min={quantityStep}
              autoFocus
            />
            <div className="supplies__purchase-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setQuantityPrompt(null)}>
                {t("common.cancel")}
              </button>
              <button type="button" className="btn btn--primary" onClick={confirmQuantityPrompt} disabled={confirmingQuantity}>
                {confirmingQuantity ? t("common.loading") : s(quantityPrompt.type === "purchase" ? "confirmPurchase" : "confirmConsume")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Supplies;
