import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

let mockTrips = [];
jest.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
jest.mock("../../store/user/userInfoSelectors", () => ({ selectMyItineraries: () => mockTrips }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars && typeof vars === "object" ? `${key}:${Object.values(vars).join("/")}` : key), i18n: { language: "es" } }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), custom: jest.fn(), dismiss: jest.fn() }) }));
jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../services/supplies", () => ({ addShoppingListItem: jest.fn(), getShoppingList: jest.fn(() => Promise.resolve([])) }));
jest.mock("../../services/packingChecklist", () => ({
  getPackingLists: jest.fn(),
  getPackingListItems: jest.fn(),
  addPackingListItem: jest.fn(),
  restartPackingList: jest.fn(),
  updatePackingList: jest.fn(),
  duplicatePackingList: jest.fn(),
  deletePackingList: jest.fn(),
  updatePackingChecklistItem: jest.fn(),
  deletePackingChecklistItem: jest.fn(),
}));

import {
  addPackingListItem, deletePackingList, duplicatePackingList, getPackingListItems, getPackingLists, restartPackingList,
  updatePackingChecklistItem, updatePackingList,
} from "../../services/packingChecklist";
import toast from "react-hot-toast";
import { addShoppingListItem, getShoppingList } from "../../services/supplies";
import { trackEvent } from "../../utils/analytics";
import PackingList from "./PackingList";

const LIST = { id: "l1", name: "Antes de arrancar", itemCount: 2, checkedCount: 1 };
let nextPosition = 0;
const item = (id, name, category, checked = false, extra = {}) => ({ id, name, category, checked, listId: "l1", position: ++nextPosition, ...extra });

const renderList = (listItems = [item("i1", "Gas cerrado", "van", true), item("i2", "Toldo recogido", "van")]) => {
  getPackingLists.mockResolvedValue({ lists: [LIST], freeTierUsage: { limited: true, used: 1, limit: 2 } });
  getPackingListItems.mockResolvedValue(listItems);
  return render(
    <MemoryRouter initialEntries={["/packing-checklist/l1"]}>
      <Routes>
        <Route path="/packing-checklist" element={<p>all lists</p>} />
        <Route path="/packing-checklist/:listId" element={<PackingList />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => { jest.clearAllMocks(); mockTrips = []; });

// Regression: every category showed, empty ones too, each with its own
// "add" box: a long page of empty boxes.
it("shows only the categories that have something", async () => {
  renderList();

  expect(await screen.findByRole("heading", { name: /packingChecklist.category.van/ })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /packingChecklist.category.clothing/ })).not.toBeInTheDocument();
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
});

it("adds something to the chosen category from the one box", async () => {
  addPackingListItem.mockResolvedValue(item("i3", "Botas", "clothing"));
  renderList();

  fireEvent.change(await screen.findByRole("textbox", { name: "packingChecklist.addItemPlaceholder" }), { target: { value: "Botas" } });
  fireEvent.change(screen.getByRole("combobox", { name: "packingChecklist.categoryLabel" }), { target: { value: "clothing" } });
  fireEvent.click(screen.getByRole("button", { name: "packingChecklist.add" }));

  await waitFor(() => expect(addPackingListItem).toHaveBeenCalledWith("l1", { category: "clothing", name: "Botas" }));
  expect(await screen.findByRole("heading", { name: /packingChecklist.category.clothing/ })).toBeInTheDocument();
});

it("unticks everything to start again, only once something is ticked", async () => {
  restartPackingList.mockResolvedValue([item("i1", "Gas cerrado", "van"), item("i2", "Toldo recogido", "van")]);
  renderList();

  fireEvent.click(await screen.findByRole("button", { name: /packingChecklist.restart/ }));

  await waitFor(() => expect(restartPackingList).toHaveBeenCalledWith("l1"));
  await waitFor(() => expect(screen.queryByRole("button", { name: /packingChecklist.restart/ })).not.toBeInTheDocument());
});

it("keeps the search box for long lists only", async () => {
  renderList();

  await screen.findByText("Gas cerrado");
  expect(screen.queryByRole("textbox", { name: "packingChecklist.searchPlaceholder" })).not.toBeInTheDocument();
});

it("copies the list and opens the copy", async () => {
  duplicatePackingList.mockResolvedValue({ id: "l2" });
  renderList();

  fireEvent.click(await screen.findByRole("button", { name: "common.moreOptions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "packingChecklist.duplicate" }));

  await waitFor(() => expect(duplicatePackingList).toHaveBeenCalledWith("l1", "packingChecklist.copyName:Antes de arrancar"));
});

it("deletes the list after asking, and goes back to all lists", async () => {
  deletePackingList.mockResolvedValue(null);
  renderList();

  fireEvent.click(await screen.findByRole("button", { name: "common.moreOptions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "packingChecklist.deleteList" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("packingChecklist.deleteListTitle:Antes de arrancar");
  fireEvent.click(within(dialog).getByRole("button", { name: "packingChecklist.deleteList" }));

  expect(await screen.findByText("all lists")).toBeInTheDocument();
  expect(deletePackingList).toHaveBeenCalledWith("l1");
});

it("offers Premium when copying goes over the free lists", async () => {
  duplicatePackingList.mockRejectedValue(Object.assign(new Error("limit"), { status: 403, field: "packingListCap" }));
  renderList();

  fireEvent.click(await screen.findByRole("button", { name: "common.moreOptions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "packingChecklist.duplicate" }));

  expect(await screen.findByText(/packingChecklist.listCapTitle/)).toBeInTheDocument();
});

// Regression: a list deleted elsewhere offered to "try again", which never could work.
it("says the list no longer exists and leads back to all lists", async () => {
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: null });
  getPackingListItems.mockRejectedValue(Object.assign(new Error("Packing list not found"), { status: 404 }));
  render(
    <MemoryRouter initialEntries={["/packing-checklist/gone"]}>
      <Routes>
        <Route path="/packing-checklist" element={<p>all lists</p>} />
        <Route path="/packing-checklist/:listId" element={<PackingList />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole("button", { name: "packingChecklist.allLists" }));

  expect(screen.getByText("all lists")).toBeInTheDocument();
});

it("renames something, moves it to another category and says how many to take", async () => {
  updatePackingChecklistItem.mockResolvedValue(item("i2", "Calcetines", "clothing", false, { quantity: 5 }));
  renderList();

  // Ticked things sink, so the unticked "Toldo recogido" comes first.
  fireEvent.click((await screen.findAllByRole("button", { name: "packingChecklist.editItem" }))[0]);
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("packingChecklist.itemName"), { target: { value: "Calcetines" } });
  fireEvent.change(within(dialog).getByLabelText("packingChecklist.categoryLabel"), { target: { value: "clothing" } });
  fireEvent.change(within(dialog).getByLabelText("packingChecklist.quantity"), { target: { value: "5" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "common.save" }));

  await waitFor(() => expect(updatePackingChecklistItem).toHaveBeenCalledWith("i2", { name: "Calcetines", category: "clothing", quantity: 5 }));
  expect(await screen.findByText("packingChecklist.quantityBadge:5")).toBeInTheDocument();
});

it("says so when a rename would repeat something in that category", async () => {
  updatePackingChecklistItem.mockRejectedValue(Object.assign(new Error("Item already in this category"), { status: 409 }));
  renderList();

  fireEvent.click((await screen.findAllByRole("button", { name: "packingChecklist.editItem" }))[0]);
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "common.save" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("packingChecklist.itemAlreadyInCategory"));
});

it("moves something up within its category while reordering", async () => {
  updatePackingChecklistItem.mockImplementation(async (id, changes) => ({ id, ...changes }));
  const listItems = [item("i1", "Gas cerrado", "van"), item("i2", "Toldo recogido", "van")];
  renderList(listItems);

  fireEvent.click(await screen.findByRole("button", { name: /packingChecklist.reorder/ }));
  expect(screen.getByRole("button", { name: "packingChecklist.moveUp:Gas cerrado" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "packingChecklist.moveUp:Toldo recogido" }));

  await waitFor(() => expect(updatePackingChecklistItem).toHaveBeenCalledTimes(2));
  expect(updatePackingChecklistItem).toHaveBeenCalledWith("i2", { position: listItems[0].position });
  expect(updatePackingChecklistItem).toHaveBeenCalledWith("i1", { position: listItems[1].position });
  const names = screen.getAllByText(/Gas cerrado|Toldo recogido/).map(node => node.textContent);
  expect(names).toEqual(["Toldo recogido", "Gas cerrado"]);
});

// Regression: tapping the cart twice added the same thing again, raising its
// amount on the shopping list.
it("marks what is already on the shopping list instead of adding it again", async () => {
  getShoppingList.mockResolvedValue([{ id: "s1", name: "toldo recogido" }]);
  addShoppingListItem.mockResolvedValue({ id: "s2", name: "Calzos" });
  renderList([item("i2", "Toldo recogido", "van"), item("i3", "Calzos", "van")]);

  expect(await screen.findByRole("img", { name: "packingChecklist.onShoppingList" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "packingChecklist.addToShoppingList" }));

  await waitFor(() => expect(screen.getAllByRole("img", { name: "packingChecklist.onShoppingList" })).toHaveLength(2));
  expect(screen.queryByRole("button", { name: "packingChecklist.addToShoppingList" })).not.toBeInTheDocument();
  expect(addShoppingListItem).toHaveBeenCalledTimes(1);
});


// Regression: with a single thing, ticked, there was no way to start again.
it("starts again a list of one ticked thing", async () => {
  renderList([item("i1", "Gas cerrado", "van", true)]);

  expect(await screen.findByRole("button", { name: /packingChecklist.restart/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /packingChecklist.reorder/ })).not.toBeInTheDocument();
});

// Regression: taken off the shopping list meanwhile, it still showed as on it.
it("checks the shopping list again on coming back to the tab", async () => {
  getShoppingList.mockResolvedValueOnce([{ id: "s1", name: "Toldo recogido" }]).mockResolvedValueOnce([]);
  renderList([item("i2", "Toldo recogido", "van")]);
  expect(await screen.findByRole("img", { name: "packingChecklist.onShoppingList" })).toBeInTheDocument();

  fireEvent(window, new Event("focus"));

  expect(await screen.findByRole("button", { name: "packingChecklist.addToShoppingList" })).toBeInTheDocument();
});

it("says which trip the list is for, with a way to it", async () => {
  getPackingLists.mockResolvedValue({ lists: [{ ...LIST, itinerary: { id: "t1", title: "Costa Vicentina" } }], freeTierUsage: null });
  getPackingListItems.mockResolvedValue([]);
  render(
    <MemoryRouter initialEntries={["/packing-checklist/l1"]}>
      <Routes><Route path="/packing-checklist/:listId" element={<PackingList />} /></Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole("link", { name: /packingChecklist.forTrip:Costa Vicentina/ })).toHaveAttribute("href", "/itinerary/t1");
});

it("links the list to one of the user's trips", async () => {
  mockTrips = [{ id: "t1", title: "Costa Vicentina", startDate: "2099-10-02", endDate: "2099-10-04" }];
  updatePackingList.mockResolvedValue({ ...LIST, itinerary: { id: "t1", title: "Costa Vicentina" } });
  renderList();

  fireEvent.click(await screen.findByRole("button", { name: "common.moreOptions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "packingChecklist.linkToTrip" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("packingChecklist.tripLabel"), { target: { value: "t1" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "common.save" }));

  await waitFor(() => expect(updatePackingList).toHaveBeenCalledWith("l1", { itineraryId: "t1" }));
  expect(trackEvent).toHaveBeenCalledWith("packing_list_linked_to_trip");
  expect(await screen.findByRole("link", { name: /packingChecklist.forTrip:Costa Vicentina/ })).toBeInTheDocument();
});

it("takes the list off its trip", async () => {
  getPackingLists.mockResolvedValue({ lists: [{ ...LIST, itinerary: { id: "t1", title: "Costa Vicentina" } }], freeTierUsage: null });
  getPackingListItems.mockResolvedValue([]);
  updatePackingList.mockResolvedValue({ ...LIST, itinerary: null });
  render(
    <MemoryRouter initialEntries={["/packing-checklist/l1"]}>
      <Routes><Route path="/packing-checklist/:listId" element={<PackingList />} /></Routes>
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole("button", { name: "common.moreOptions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "packingChecklist.unlinkTrip" }));

  await waitFor(() => expect(updatePackingList).toHaveBeenCalledWith("l1", { itineraryId: null }));
  await waitFor(() => expect(screen.queryByRole("link", { name: /packingChecklist.forTrip/ })).not.toBeInTheDocument());
});

