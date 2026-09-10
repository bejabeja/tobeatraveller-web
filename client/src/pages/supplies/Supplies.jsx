import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { IoAddOutline, IoBagCheckOutline, IoCartOutline, IoCloseOutline, IoPencilOutline, IoRefreshOutline, IoSearchOutline, IoTrashOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import { isPremiumRequiredError, normalizeSearchText, supplyCategories, supplyUnits } from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import Modal from "../../components/modal/Modal";
import {
  addInventoryItem, addShoppingListItem, deleteInventoryItem, deleteShoppingListItem, getInventory, getShoppingList,
  getSuppliesUsage, markInventoryItemUsedUp, markShoppingListItemPurchased, updateInventoryItem, updateShoppingListItem,
} from "../../services/supplies";
import SupplyFormModal from "./SupplyFormModal";
import "./Supplies.scss";

const Supplies = () => {
  const { t } = useTranslation();
  const s = (key, vars) => t(`supplies.${key}`, vars);

  const [tab, setTab] = useState("shopping");
  const [search, setSearch] = useState("");
  const [shoppingList, setShoppingList] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formTarget, setFormTarget] = useState(null); // { mode: 'add-shopping' | 'add-inventory' | 'edit-shopping' | 'edit-inventory', item? }
  const [deleteTarget, setDeleteTarget] = useState(null); // { mode, id }
  const [deleting, setDeleting] = useState(false);
  const [quantityPrompt, setQuantityPrompt] = useState(null); // { type: 'purchase' | 'consume', item }
  const [quantityValue, setQuantityValue] = useState("");
  const [confirmingQuantity, setConfirmingQuantity] = useState(false);
  const [freeTierUsage, setFreeTierUsage] = useState(null);

  const loadData = () => {
    setLoading(true);
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
        toast.success(amount < item.amount ? s("amountUpdated", { name: item.name }) : s("movedToShoppingList", { name: item.name }));
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

  if (error) {
    return (
      <section className="section__container">
        <FeatureLoadState status={error} feature="supplies" onRetry={loadData} />
      </section>
    );
  }

  const tabItems = tab === "shopping" ? shoppingList : inventory;
  const query = normalizeSearchText(search.trim());
  const items = query ? tabItems.filter(item => normalizeSearchText(item.name).includes(query)) : tabItems;

  const knownItems = Object.values(
    [...inventory, ...shoppingList].reduce((byKey, current) => {
      const key = `${current.name.toLowerCase()}|${current.unit}`;
      if (!byKey[key]) byKey[key] = { name: current.name, unit: current.unit, category: current.category };
      return byKey;
    }, {})
  );

  return (
    <section className="supplies section__container">
      <div className="supplies__header">
        <div className="supplies__header-titles">
          <h1 className="supplies__title">{s("title")}</h1>
          {currentListUsage?.limited && (
            <Link to="/subscription" className="supplies__free-tier-pill">
              {s("freeTierUsage", { used: currentListUsage.used, limit: currentListUsage.limit })}
            </Link>
          )}
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setFormTarget({ mode: tab === "shopping" ? "add-shopping" : "add-inventory" })}>
          <IoAddOutline /> {s("addItem")}
        </button>
      </div>

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

      {(shoppingList.length > 0 || inventory.length > 0) && (
        <div className="supplies__search">
          <IoSearchOutline className="supplies__search-icon" />
          <input
            type="text"
            className="supplies__search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={s("searchPlaceholder")}
          />
          {search && (
            <button type="button" className="supplies__search-clear" onClick={() => setSearch("")} aria-label={t("common.close")}>
              <IoCloseOutline />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="supplies__list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton supplies__item-skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="supplies__empty">
          <p>
            {query
              ? s("noSearchResults", { query: search.trim() })
              : (tab === "shopping" ? s("noShoppingItems") : s("noInventoryItems"))}
          </p>
        </div>
      ) : (
        <div className="supplies__list">
          {items.map((item) => (
            <div key={item.id} className="supplies__item">
              <div className="supplies__item-main">
                <span className="supplies__item-category">{categoryLabel(item.category)}</span>
                <span className="supplies__item-name">{item.name}</span>
                <span className="supplies__item-amount">{item.amount} {s(`unit.${item.unit}`, item.unit)}</span>
                {item.notes && <p className="supplies__item-notes">{item.notes}</p>}
              </div>
              <div className="supplies__item-actions">
                {tab === "shopping" ? (
                  <button type="button" className="supplies__item-action-btn supplies__item-action-btn--primary" onClick={() => openQuantityPrompt("purchase", item)} title={s("markPurchased")}>
                    <IoBagCheckOutline />
                  </button>
                ) : (
                  <button type="button" className="supplies__item-action-btn supplies__item-action-btn--primary" onClick={() => openQuantityPrompt("consume", item)} title={s("markUsedUp")}>
                    <IoRefreshOutline />
                  </button>
                )}
                <button
                  type="button"
                  className="supplies__item-action-btn"
                  onClick={() => setFormTarget({ mode: tab === "shopping" ? "edit-shopping" : "edit-inventory", item })}
                  aria-label={t("common.edit")}
                >
                  <IoPencilOutline />
                </button>
                <button
                  type="button"
                  className="supplies__item-action-btn"
                  onClick={() => setDeleteTarget({ mode: tab, id: item.id })}
                  aria-label={t("common.delete")}
                >
                  <IoTrashOutline />
                </button>
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
          initialCapReached={formTarget.mode.startsWith("add") && atCurrentListCap}
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
                amount: quantityPrompt.item.amount, unit: s(`unit.${quantityPrompt.item.unit}`, quantityPrompt.item.unit),
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
