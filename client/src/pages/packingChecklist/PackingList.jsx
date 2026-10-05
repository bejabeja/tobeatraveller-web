import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  IoAddOutline, IoArrowBack, IoCartOutline, IoCheckmarkCircle, IoChevronDown, IoChevronUp, IoCloseOutline, IoCopyOutline,
  IoCreateOutline, IoListOutline, IoMapOutline, IoPencilOutline, IoRepeatOutline, IoSearchOutline, IoSwapVerticalOutline,
  IoTrashOutline, IoUnlinkOutline,
} from "react-icons/io5";
import { useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  copyListName, isOnShoppingList, isPackingListCapReachedError, localCalendarDay, MOVE_DOWN, MOVE_UP, moveWithinCategory, normalizeSearchText,
  packingCategories, tripsToLinkTo,
} from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import SelectMenu from "../../components/form/SelectMenu";
import TripActionsMenu from "../../components/itineraries/TripActionsMenu";
import Modal from "../../components/modal/Modal";
import ToolEmptyState from "../../components/toolPage/ToolEmptyState";
import ToolHeader from "../../components/toolPage/ToolHeader";
import { addShoppingListItem, getShoppingList } from "../../services/supplies";
import {
  addPackingListItem, deletePackingChecklistItem, deletePackingList, duplicatePackingList, getPackingListItems,
  getPackingLists, restartPackingList, updatePackingChecklistItem, updatePackingList,
} from "../../services/packingChecklist";
import { selectMyItineraries } from "../../store/user/userInfoSelectors";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS } from "../../utils/analyticsEvents";
import PackingItemFormModal from "./PackingItemFormModal";
import PackingListFormModal from "./PackingListFormModal";
import PackingListTripModal from "./PackingListTripModal";
import "./PackingChecklist.scss";

// No supply category maps cleanly onto every packing category (there's no
// "electronics"/"documents" bucket in the shopping list), so anything without
// an obvious match falls back to "other" rather than guessing wrong.
const PACKING_TO_SUPPLY_CATEGORY = { cleaning: "cleaning", toiletries: "hygiene" };

const UNDO_DELETE_WINDOW_MS = 5000;
// A short list is read at a glance; the search box only helps a long one.
const SEARCH_FROM_ITEMS = 15;
const DEFAULT_NEW_ITEM_CATEGORY = "other";
const LISTS_PATH = "/packing-checklist";
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

const byPosition = (a, b) => a.position - b.position;
// Ticked things sink to the bottom, except while reordering, where the list
// shows the order it's saved in.
const byCheckedThenPosition = (a, b) => Number(a.checked) - Number(b.checked) || byPosition(a, b);

const PackingList = () => {
  const { t } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const { listId } = useParams();
  const navigate = useNavigate();

  const [list, setList] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState(DEFAULT_NEW_ITEM_CATEGORY);
  const [addingToShoppingList, setAddingToShoppingList] = useState(null); // item id in flight
  const [restarting, setRestarting] = useState(false);
  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [shoppingList, setShoppingList] = useState([]);
  const [choosingTrip, setChoosingTrip] = useState(false);
  const trips = tripsToLinkTo(useSelector(selectMyItineraries), localCalendarDay());
  const pendingDeletes = useRef({}); // { [itemId]: timeoutId }

  const loadList = () => {
    setLoading(true);
    Promise.all([getPackingLists(), getPackingListItems(listId)])
      .then(([{ lists }, listItems]) => {
        setList(lists.find((candidate) => candidate.id === listId) ?? null);
        setItems(listItems);
        setError(null);
      })
      .catch((err) => setError(err?.status === NOT_FOUND_STATUS ? "notFound" : "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadList(); }, [listId]);

  // Only to show what's already on it; the list works just the same without.
  // Asked again on coming back to the tab, since it may have changed on the
  // shopping list meanwhile.
  useEffect(() => {
    const loadShoppingList = () => getShoppingList().then(setShoppingList).catch(() => {});
    loadShoppingList();
    window.addEventListener("focus", loadShoppingList);
    return () => window.removeEventListener("focus", loadShoppingList);
  }, []);

  // A pending undo-delete's setTimeout isn't cancelled by React on unmount, so
  // without this it can outlive the page (navigate away and back within the undo
  // window) and complete the delete against a component instance nobody sees
  // anymore, desyncing the UI. Flushing immediately on unmount keeps the outcome
  // deterministic: either you see the undo option, or leaving finalizes it.
  useEffect(() => () => {
    Object.entries(pendingDeletes.current).forEach(([itemId, timeoutId]) => {
      clearTimeout(timeoutId);
      deletePackingChecklistItem(itemId).catch(() => toast.error(p("deleteError")));
    });
  }, []);

  const categoryLabel = (value) => {
    const fallback = packingCategories.find(c => c.value === value)?.label ?? value;
    return p(`category.${value}`, fallback);
  };

  const restart = async () => {
    setRestarting(true);
    try {
      setItems(await restartPackingList(listId));
      toast.success(p("restartDone"));
    } catch (err) {
      toast.error(err.message || p("saveError"));
    } finally {
      setRestarting(false);
    }
  };

  const rename = async ({ name }) => {
    try {
      setList(await updatePackingList(listId, { name }));
      setRenaming(false);
    } catch (err) {
      toast.error(err.message || p("saveError"));
    }
  };

  const linkTrip = async (itineraryId) => {
    try {
      setList(await updatePackingList(listId, { itineraryId }));
      if (itineraryId) trackEvent(ANALYTICS_EVENTS.PACKING_LIST_LINKED_TO_TRIP);
      setChoosingTrip(false);
    } catch (err) {
      toast.error(err.message || p("saveError"));
    }
  };

  const duplicate = async () => {
    try {
      const copy = await duplicatePackingList(listId, copyListName(list.name, name => p("copyName", { name })));
      navigate(`${LISTS_PATH}/${copy.id}`);
    } catch (err) {
      if (isPackingListCapReachedError(err)) setCapReached(true);
      else toast.error(err.message || p("saveError"));
    }
  };

  const removeList = async () => {
    setDeleting(true);
    try {
      await deletePackingList(listId);
      toast.success(p("listDeleted"));
      navigate(LISTS_PATH);
    } catch (err) {
      toast.error(err.message || p("deleteError"));
      setDeleting(false);
    }
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
      const added = await addShoppingListItem({
        name: item.name,
        category: PACKING_TO_SUPPLY_CATEGORY[item.category] ?? "other",
        amount: item.quantity ?? 1,
        unit: "units",
      });
      setShoppingList(prev => [...prev, added]);
      toast.success(p("addedToShoppingList", { name: item.name }));
    } catch (err) {
      toast.error(err.message || p("saveError"));
    } finally {
      setAddingToShoppingList(null);
    }
  };

  const saveItem = async (changes) => {
    try {
      const saved = await updatePackingChecklistItem(editingItem.id, changes);
      setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
      setEditingItem(null);
    } catch (err) {
      toast.error(err?.status === CONFLICT_STATUS ? p("itemAlreadyInCategory") : (err.message || p("saveError")));
    }
  };

  const moveItem = async (item, direction) => {
    const moves = moveWithinCategory(items, item.id, direction);
    if (moves.length === 0) return;
    const previous = items;
    const placed = Object.fromEntries(moves.map(({ id, position }) => [id, position]));
    setItems(prev => prev.map(i => (i.id in placed ? { ...i, position: placed[i.id] } : i)));
    try {
      await Promise.all(moves.map(({ id, position }) => updatePackingChecklistItem(id, { position })));
    } catch (err) {
      setItems(previous);
      toast.error(err.message || p("saveError"));
    }
  };

  const addItem = async (event) => {
    event.preventDefault();
    const name = newItemName.trim();
    if (!name) return;
    if (items.some(item => item.category === newItemCategory && item.name.toLowerCase() === name.toLowerCase())) {
      toast.error(p("itemAlreadyInCategory"));
      return;
    }
    try {
      const created = await addPackingListItem(listId, { category: newItemCategory, name });
      setItems(prev => [...prev, created]);
      setNewItemName("");
    } catch (err) {
      toast.error(err.message || p("saveError"));
    }
  };

  // Deleted elsewhere (on the phone, say): trying again wouldn't help.
  if (error === "notFound" || (!loading && !error && !list)) {
    return (
      <section className="packing-checklist section__container">
        <ToolEmptyState Icon={IoListOutline} text={p("listNotFound")} actionLabel={p("allLists")} onAction={() => navigate(LISTS_PATH)} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="section__container">
        <FeatureLoadState status="error" feature="packingChecklist" onRetry={loadList} />
      </section>
    );
  }

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

  return (
    <section className="packing-checklist section__container">
      <Link to={LISTS_PATH} className="packing-checklist__back">
        <IoArrowBack aria-hidden="true" /> {p("allLists")}
      </Link>

      <ToolHeader title={list?.name ?? p("title")}>
        {totalCount > 0 && (
          <span className={`packing-checklist__progress ${checkedCount === totalCount ? "packing-checklist__progress--complete" : ""}`}>
            {p("progress", { checked: checkedCount, total: totalCount })}
          </span>
        )}
        {list && (
          <TripActionsMenu
            toggleClassName="packing-checklist__menu-toggle"
            items={[
              { key: "rename", label: p("rename"), Icon: IoCreateOutline, onSelect: () => setRenaming(true) },
              { key: "trip", label: list.itinerary ? p("changeTrip") : p("linkToTrip"), Icon: IoMapOutline, onSelect: () => setChoosingTrip(true) },
              ...(list.itinerary ? [{ key: "unlink", label: p("unlinkTrip"), Icon: IoUnlinkOutline, onSelect: () => linkTrip(null) }] : []),
              { key: "duplicate", label: p("duplicate"), Icon: IoCopyOutline, onSelect: duplicate },
              { key: "delete", label: p("deleteList"), Icon: IoTrashOutline, onSelect: () => setConfirmingDelete(true), danger: true },
            ]}
          />
        )}
      </ToolHeader>

      {list?.itinerary && (
        <Link to={`/itinerary/${list.itinerary.id}`} className="packing-checklist__trip">
          <IoMapOutline aria-hidden="true" /> {p("forTrip", { title: list.itinerary.title })}
        </Link>
      )}

      <form className="packing-checklist__add-row packing-checklist__add-row--main" onSubmit={addItem}>
        <input
          type="text"
          className="packing-checklist__add-input"
          placeholder={p("addItemPlaceholder")}
          aria-label={p("addItemPlaceholder")}
          value={newItemName}
          onChange={(event) => setNewItemName(event.target.value)}
        />
        <SelectMenu
          variant="compact"
          className="packing-checklist__add-category"
          ariaLabel={p("categoryLabel")}
          options={packingCategories.map(({ value }) => ({ value, label: categoryLabel(value) }))}
          value={newItemCategory}
          onChange={setNewItemCategory}
        />
        <button type="submit" className="packing-checklist__add-btn" aria-label={p("add")}>
          <IoAddOutline />
        </button>
      </form>

      {(checkedCount > 0 || canReorder) && (
        <div className="packing-checklist__toolbar">
          {totalCount >= SEARCH_FROM_ITEMS && (
            <div className="packing-checklist__search">
              <IoSearchOutline className="packing-checklist__search-icon" />
              <input
                type="text"
                className="packing-checklist__search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={p("searchPlaceholder")}
                aria-label={p("searchPlaceholder")}
              />
              {search && (
                <button type="button" className="packing-checklist__search-clear" onClick={() => setSearch("")} aria-label={t("common.close")}>
                  <IoCloseOutline />
                </button>
              )}
            </div>
          )}
          <div className="packing-checklist__toolbar-actions">
            {checkedCount > 0 && !reordering && (
              <button type="button" className="btn btn--ghost packing-checklist__restart" onClick={restart} disabled={restarting}>
                <IoRepeatOutline /> {restarting ? t("common.loading") : p("restart")}
              </button>
            )}
            {canReorder && (
              <button
                type="button"
                className={`btn ${reordering ? "btn--primary" : "btn--ghost"} packing-checklist__restart`}
                onClick={() => setReordering(value => !value)}
                aria-pressed={reordering}
              >
                <IoSwapVerticalOutline /> {reordering ? p("reorderDone") : p("reorder")}
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="packing-checklist__categories">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton packing-checklist__category-skeleton" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="packing-checklist__empty"><p>{p("noItems")}</p></div>
      ) : visibleCategories.length === 0 ? (
        <div className="packing-checklist__empty"><p>{p("noSearchResults", { query: search.trim() })}</p></div>
      ) : (
        <div className="packing-checklist__categories">
          {visibleCategories.map(({ category, items: categoryItems }) => (
            <div key={category} className="packing-checklist__category">
              <h2 className="packing-checklist__category-title">
                {categoryLabel(category)}
                <span className={`packing-checklist__category-count ${categoryItems.every(i => i.checked) ? "packing-checklist__category-count--complete" : ""}`}>
                  {categoryItems.filter(i => i.checked).length}/{categoryItems.length}
                </span>
              </h2>

              <div className="packing-checklist__items">
                {categoryItems.map((item, index) => {
                  const onShoppingList = isOnShoppingList(shoppingList, item.name);
                  return (
                    <div key={item.id} className={`packing-checklist__item ${item.checked ? "packing-checklist__item--checked" : ""}`}>
                      <label className="packing-checklist__item-label">
                        <input type="checkbox" checked={item.checked} onChange={() => toggleChecked(item)} />
                        <span>{item.name}</span>
                        {item.quantity > 1 && (
                          <span className="packing-checklist__item-quantity">{p("quantityBadge", { count: item.quantity })}</span>
                        )}
                      </label>
                      {reordering ? (
                        <div className="packing-checklist__item-actions">
                          <button
                            type="button"
                            className="packing-checklist__item-action-btn"
                            onClick={() => moveItem(item, MOVE_UP)}
                            disabled={index === 0}
                            aria-label={p("moveUp", { name: item.name })}
                          >
                            <IoChevronUp />
                          </button>
                          <button
                            type="button"
                            className="packing-checklist__item-action-btn"
                            onClick={() => moveItem(item, MOVE_DOWN)}
                            disabled={index === categoryItems.length - 1}
                            aria-label={p("moveDown", { name: item.name })}
                          >
                            <IoChevronDown />
                          </button>
                        </div>
                      ) : (
                        <div className="packing-checklist__item-actions">
                          {!item.checked && (onShoppingList ? (
                            <span className="packing-checklist__item-on-list" role="img" aria-label={p("onShoppingList")} title={p("onShoppingList")}>
                              <IoCheckmarkCircle aria-hidden="true" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="packing-checklist__item-action-btn"
                              onClick={() => addToShoppingList(item)}
                              disabled={addingToShoppingList === item.id}
                              aria-label={p("addToShoppingList")}
                              title={p("addToShoppingList")}
                            >
                              <IoCartOutline />
                            </button>
                          ))}
                          <button
                            type="button"
                            className="packing-checklist__item-action-btn"
                            onClick={() => setEditingItem(item)}
                            aria-label={p("editItem")}
                            title={p("editItem")}
                          >
                            <IoPencilOutline />
                          </button>
                          <button
                            type="button"
                            className="packing-checklist__item-action-btn"
                            onClick={() => removeItem(item)}
                            aria-label={t("common.delete")}
                            title={t("common.delete")}
                          >
                            <IoTrashOutline />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingItem && (
        <PackingItemFormModal
          item={editingItem}
          categoryLabel={categoryLabel}
          onClose={() => setEditingItem(null)}
          onSubmit={saveItem}
        />
      )}

      {choosingTrip && (
        <PackingListTripModal
          trips={trips}
          currentTripId={list.itinerary?.id}
          onClose={() => setChoosingTrip(false)}
          onSubmit={linkTrip}
        />
      )}

      {renaming && (
        <PackingListFormModal
          title={p("rename")}
          submitLabel={t("common.save")}
          initialName={list.name}
          onClose={() => setRenaming(false)}
          onSubmit={rename}
        />
      )}

      {capReached && (
        <PackingListFormModal title={p("duplicate")} capReached onClose={() => setCapReached(false)} onSubmit={() => {}} />
      )}

      <Modal
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={removeList}
        title={p("deleteListTitle", { name: list?.name })}
        description={p("deleteListDesc")}
        confirmText={p("deleteList")}
        type="danger"
        loading={deleting}
      />
    </section>
  );
};

export default PackingList;
