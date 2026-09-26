import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  IoAddOutline, IoCartOutline, IoCloseOutline, IoRefreshOutline,
  IoRepeatOutline, IoSearchOutline, IoTrashOutline,
} from "react-icons/io5";
import { defaultPackingItems, isPremiumRequiredError, normalizeSearchText, packingCategories, toAppLanguage } from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import { addShoppingListItem } from "../../services/supplies";
import {
  addPackingChecklistItem, deletePackingChecklistItem, getPackingChecklist,
  resetPackingChecklistTrip, seedPackingChecklistDefaults, updatePackingChecklistItem,
} from "../../services/packingChecklist";
import "./PackingChecklist.scss";

// No supply category maps cleanly onto every packing category (there's no
// "electronics"/"documents" bucket in the shopping list), so anything without
// an obvious match falls back to "other" rather than guessing wrong.
const PACKING_TO_SUPPLY_CATEGORY = { cleaning: "cleaning", toiletries: "hygiene" };

const UNDO_DELETE_WINDOW_MS = 5000;

const localizedDefaultItems = (i18n) => {
  return Object.entries(defaultPackingItems[toAppLanguage(i18n.language)]).flatMap(([category, names]) =>
    names.map(name => ({ category, name }))
  );
};

const PackingChecklist = () => {
  const { t, i18n } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItemInputs, setNewItemInputs] = useState({}); // { [category]: string }
  const [addingToShoppingList, setAddingToShoppingList] = useState(null); // item id in flight
  const [restoring, setRestoring] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [search, setSearch] = useState("");
  const pendingDeletes = useRef({}); // { [itemId]: timeoutId }

  const loadData = () => {
    setLoading(true);
    getPackingChecklist()
      .then(async (res) => {
        if (res.length === 0) {
          res = await seedPackingChecklistDefaults(localizedDefaultItems(i18n));
        }
        setItems(res);
        setError(null);
      })
      .catch((err) => setError(isPremiumRequiredError(err) ? "premium" : "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  // A pending undo-delete's setTimeout isn't cancelled by React on unmount, so
  // without this it can outlive the page (navigate away and back within the undo
  // window) and complete the delete against a component instance nobody sees
  // anymore, desyncing the UI. Flushing immediately on unmount keeps the outcome
  // deterministic: either you see the undo option, or leaving finalizes it.
  useEffect(() => () => {
    Object.entries(pendingDeletes.current).forEach(([itemId, timeoutId]) => {
      clearTimeout(timeoutId);
      deletePackingChecklistItem(itemId).catch(() => {});
    });
  }, []);

  const restoreDefaults = async () => {
    setRestoring(true);
    try {
      const before = items.length;
      const res = await seedPackingChecklistDefaults(localizedDefaultItems(i18n));
      setItems(res);
      const restoredCount = res.length - before;
      toast.success(restoredCount > 0 ? p("defaultsRestored", { count: restoredCount }) : p("nothingToRestore"));
    } catch (err) {
      toast.error(err.message || p("saveError"));
    } finally {
      setRestoring(false);
    }
  };

  const startNewTrip = async () => {
    setResetting(true);
    try {
      const res = await resetPackingChecklistTrip();
      setItems(res);
      toast.success(p("tripReset"));
    } catch (err) {
      toast.error(err.message || p("saveError"));
    } finally {
      setResetting(false);
    }
  };

  const categoryLabel = (value) => {
    const fallback = packingCategories.find(c => c.value === value)?.label ?? value;
    return p(`category.${value}`, fallback);
  };

  const toggleChecked = async (item) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i));
    try {
      await updatePackingChecklistItem(item.id, { checked: !item.checked });
    } catch (err) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: item.checked } : i));
      toast.error(err.message || p("saveError"));
    }
  };

  const undoRemove = (item) => {
    const timeoutId = pendingDeletes.current[item.id];
    if (!timeoutId) return;
    clearTimeout(timeoutId);
    delete pendingDeletes.current[item.id];
    setItems(prev => [...prev, item]);
    toast.dismiss(`delete-${item.id}`);
  };

  const removeItem = (item) => {
    setItems(prev => prev.filter(i => i.id !== item.id));

    toast.custom(
      () => (
        <div className="packing-checklist__undo-toast">
          <span>{p("itemDeleted", { name: item.name })}</span>
          <button type="button" className="packing-checklist__undo-btn" onClick={() => undoRemove(item)}>
            {p("undo")}
          </button>
        </div>
      ),
      { id: `delete-${item.id}`, duration: UNDO_DELETE_WINDOW_MS }
    );

    pendingDeletes.current[item.id] = setTimeout(async () => {
      delete pendingDeletes.current[item.id];
      try {
        await deletePackingChecklistItem(item.id);
      } catch (err) {
        setItems(prev => [...prev, item]);
        toast.error(err.message || p("deleteError"));
      }
    }, UNDO_DELETE_WINDOW_MS);
  };

  const addToShoppingList = async (item) => {
    setAddingToShoppingList(item.id);
    try {
      await addShoppingListItem({
        name: item.name,
        category: PACKING_TO_SUPPLY_CATEGORY[item.category] ?? "other",
        amount: 1,
        unit: "units",
      });
      toast.success(p("addedToShoppingList", { name: item.name }));
    } catch (err) {
      toast.error(err.message || p("saveError"));
    } finally {
      setAddingToShoppingList(null);
    }
  };

  const handleAddCustomItem = async (category) => {
    const name = (newItemInputs[category] || "").trim();
    if (!name) return;
    try {
      const created = await addPackingChecklistItem({ category, name });
      setItems(prev => [...prev, created]);
      setNewItemInputs(prev => ({ ...prev, [category]: "" }));
    } catch (err) {
      toast.error(err.message || p("saveError"));
    }
  };

  if (error) {
    return (
      <section className="section__container">
        <FeatureLoadState status={error} feature="packingChecklist" onRetry={loadData} />
      </section>
    );
  }

  const totalCount = items.length;
  const checkedCount = items.filter(i => i.checked).length;
  const query = normalizeSearchText(search.trim());
  const matchesQuery = (item) => !query || normalizeSearchText(item.name).includes(query);
  const hasSearchResults = !query || items.some(matchesQuery);

  return (
    <section className="packing-checklist section__container">
      <div className="packing-checklist__header">
        <h1 className="packing-checklist__title">{p("title")}</h1>
        {totalCount > 0 && (
          <span className={`packing-checklist__progress ${checkedCount === totalCount ? "packing-checklist__progress--complete" : ""}`}>
            {p("progress", { checked: checkedCount, total: totalCount })}
          </span>
        )}
      </div>

      {totalCount > 0 && (
        <div className="packing-checklist__toolbar">
          <div className="packing-checklist__search">
            <IoSearchOutline className="packing-checklist__search-icon" />
            <input
              type="text"
              className="packing-checklist__search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={p("searchPlaceholder")}
            />
            {search && (
              <button type="button" className="packing-checklist__search-clear" onClick={() => setSearch("")} aria-label={t("common.close")}>
                <IoCloseOutline />
              </button>
            )}
          </div>

          <div className="packing-checklist__header-actions">
            <button type="button" className="btn btn--ghost" onClick={startNewTrip} disabled={resetting}>
              <IoRepeatOutline /> {resetting ? t("common.loading") : p("startNewTrip")}
            </button>
            <button type="button" className="btn btn--ghost" onClick={restoreDefaults} disabled={restoring}>
              <IoRefreshOutline /> {restoring ? t("common.loading") : p("restoreDefaults")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="packing-checklist__categories">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton packing-checklist__category-skeleton" />
          ))}
        </div>
      ) : !hasSearchResults ? (
        <div className="packing-checklist__empty">
          <p>{p("noSearchResults", { query: search.trim() })}</p>
        </div>
      ) : (
        <div className="packing-checklist__categories">
          {packingCategories.map(({ value: category }) => {
            const categoryItems = items
              .filter(i => i.category === category && matchesQuery(i))
              .sort((a, b) => Number(a.checked) - Number(b.checked));
            if (query && categoryItems.length === 0) return null;
            return (
              <div key={category} className="packing-checklist__category">
                <h2 className="packing-checklist__category-title">
                  {categoryLabel(category)}
                  {categoryItems.length > 0 && (
                    <span className={`packing-checklist__category-count ${categoryItems.every(i => i.checked) ? "packing-checklist__category-count--complete" : ""}`}>
                      {categoryItems.filter(i => i.checked).length}/{categoryItems.length}
                    </span>
                  )}
                </h2>

                <div className="packing-checklist__items">
                  {categoryItems.map((item) => (
                    <div key={item.id} className={`packing-checklist__item ${item.checked ? "packing-checklist__item--checked" : ""}`}>
                      <label className="packing-checklist__item-label">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleChecked(item)}
                        />
                        <span>{item.name}</span>
                      </label>
                      <div className="packing-checklist__item-actions">
                        {!item.checked && (
                          <button
                            type="button"
                            className="packing-checklist__item-action-btn"
                            onClick={() => addToShoppingList(item)}
                            disabled={addingToShoppingList === item.id}
                            title={p("addToShoppingList")}
                          >
                            <IoCartOutline />
                          </button>
                        )}
                        <button
                          type="button"
                          className="packing-checklist__item-action-btn"
                          onClick={() => removeItem(item)}
                          aria-label={t("common.delete")}
                        >
                          <IoTrashOutline />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="packing-checklist__add-row">
                  <input
                    type="text"
                    className="packing-checklist__add-input"
                    placeholder={p("addItemPlaceholder")}
                    value={newItemInputs[category] || ""}
                    onChange={(e) => setNewItemInputs(prev => ({ ...prev, [category]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomItem(category); } }}
                  />
                  <button type="button" className="packing-checklist__add-btn" onClick={() => handleAddCustomItem(category)}>
                    <IoAddOutline />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default PackingChecklist;
