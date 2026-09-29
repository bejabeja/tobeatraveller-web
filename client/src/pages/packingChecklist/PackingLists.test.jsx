import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

let mockTrips = [];
let mockTripsLoaded = true;
beforeEach(() => { mockTripsLoaded = true; });
jest.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
jest.mock("../../store/user/userInfoSelectors", () => ({
  selectMyItineraries: () => mockTrips,
  selectMyItinerariesLoaded: () => mockTripsLoaded,
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join("/")}` : key), i18n: { language: "es" } }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../services/packingChecklist", () => ({ getPackingLists: jest.fn(), createPackingList: jest.fn() }));

import { createPackingList, getPackingLists } from "../../services/packingChecklist";
import PackingLists from "./PackingLists";

const pageAt = (path) => (
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/packing-checklist" element={<PackingLists />} />
      <Route path="/packing-checklist/:listId" element={<p>opened list</p>} />
    </Routes>
  </MemoryRouter>
);
const renderPage = (path = "/packing-checklist") => render(pageAt(path));

const FREE_USAGE = { limited: true, used: 1, limit: 2 };

beforeEach(() => { jest.clearAllMocks(); mockTrips = []; });

it("shows each list with how far along it is", async () => {
  getPackingLists.mockResolvedValue({
    lists: [{ id: "l1", name: "Antes de arrancar", itemCount: 12, checkedCount: 3 }, { id: "l2", name: "Surf", itemCount: 0, checkedCount: 0 }],
    freeTierUsage: FREE_USAGE,
  });

  renderPage();

  expect(await screen.findByRole("link", { name: /Antes de arrancar/ })).toHaveAttribute("href", "/packing-checklist/l1");
  expect(screen.getByText("packingChecklist.listProgress:3/12")).toBeInTheDocument();
  expect(screen.getByText("packingChecklist.listEmpty")).toBeInTheDocument();
});

// Regression: the first visit loaded some seventy things at once.
it("offers to start a first list instead of loading a full one", async () => {
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: { limited: true, used: 0, limit: 2 } });

  renderPage();

  expect(await screen.findByText("packingChecklist.noLists")).toBeInTheDocument();
  expect(createPackingList).not.toHaveBeenCalled();
});

it("creates a list from the chosen template, named after it, and opens it", async () => {
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: FREE_USAGE });
  createPackingList.mockResolvedValue({ id: "new-list" });
  renderPage();

  fireEvent.click((await screen.findAllByRole("button", { name: /packingChecklist.newList/ }))[0]);
  fireEvent.click(screen.getByRole("radio", { name: /packingChecklist.templates.departure.name/ }));
  fireEvent.click(screen.getByRole("button", { name: "packingChecklist.createList" }));

  await waitFor(() => expect(createPackingList).toHaveBeenCalled());
  const { name, items } = createPackingList.mock.calls[0][0];
  expect(name).toBe("packingChecklist.templates.departure.name");
  expect(items[0]).toEqual({ category: "van", name: "Gas cerrado" });
  expect(await screen.findByText("opened list")).toBeInTheDocument();
});

it("asks for a name for an empty list", async () => {
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: FREE_USAGE });
  renderPage();

  fireEvent.click((await screen.findAllByRole("button", { name: /packingChecklist.newList/ }))[0]);
  fireEvent.click(screen.getByRole("button", { name: "packingChecklist.createList" }));

  expect(screen.getByRole("alert")).toHaveTextContent("validation.nameRequired");
  expect(createPackingList).not.toHaveBeenCalled();
});

it("leads to Premium once the free lists are used up", async () => {
  getPackingLists.mockResolvedValue({ lists: [{ id: "l1", name: "A", itemCount: 0, checkedCount: 0 }, { id: "l2", name: "B", itemCount: 0, checkedCount: 0 }], freeTierUsage: { limited: true, used: 2, limit: 2 } });

  renderPage();

  expect(await screen.findByRole("link", { name: /tools.unlockMore/ })).toHaveAttribute("href", "/subscription#subscription-plans");
});

it("offers Premium when the server says the free lists are used up", async () => {
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: FREE_USAGE });
  createPackingList.mockRejectedValue(Object.assign(new Error("limit"), { status: 403, field: "packingListCap" }));
  renderPage();

  fireEvent.click((await screen.findAllByRole("button", { name: /packingChecklist.newList/ }))[0]);
  fireEvent.click(screen.getByRole("radio", { name: /packingChecklist.templates.weekend.name/ }));
  fireEvent.click(screen.getByRole("button", { name: "packingChecklist.createList" }));

  expect(await screen.findByText("packingChecklist.listCapTitle:2")).toBeInTheDocument();
});

it("starts a list for the trip it was opened for, named after it and with a template for its length", async () => {
  mockTrips = [{ id: "t1", title: "Costa Vicentina", startDate: "2099-10-02", endDate: "2099-10-09", tripTotalDays: 8 }];
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: FREE_USAGE });
  createPackingList.mockResolvedValue({ id: "new-list" });
  renderPage("/packing-checklist?forTrip=t1");

  expect(await screen.findByRole("radio", { name: /packingChecklist.templates.longTrip.name/ })).toBeChecked();
  expect(screen.getByLabelText("packingChecklist.tripLabel")).toHaveTextContent("Costa Vicentina");
  fireEvent.click(screen.getByRole("button", { name: "packingChecklist.createList" }));

  await waitFor(() => expect(createPackingList).toHaveBeenCalled());
  expect(createPackingList.mock.calls[0][0]).toMatchObject({ name: "Costa Vicentina", itineraryId: "t1" });
  expect(require("../../utils/analytics").trackEvent).toHaveBeenCalledWith("packing_list_created", { template: "longTrip", for_trip: true });
});

// Regression: on a page reload the form opened before the trips were in and
// the list was made without its trip.
it("waits for the trips before opening the form for one", async () => {
  mockTripsLoaded = false;
  mockTrips = [];
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: FREE_USAGE });
  const { rerender } = renderPage("/packing-checklist?forTrip=t1");
  await waitFor(() => expect(getPackingLists).toHaveBeenCalled());
  expect(screen.queryByLabelText("packingChecklist.tripLabel")).not.toBeInTheDocument();

  mockTripsLoaded = true;
  mockTrips = [{ id: "t1", title: "Costa Vicentina", startDate: "2099-10-02", endDate: "2099-10-09", tripTotalDays: 8 }];
  rerender(pageAt("/packing-checklist?forTrip=t1"));

  expect(await screen.findByLabelText("packingChecklist.tripLabel")).toHaveTextContent("Costa Vicentina");
});

// Regression: a free plan with no lists left saw the whole form and only
// learnt about the limit after filling it in.
it("offers Premium straight away when opened for a trip with the free lists used up", async () => {
  mockTrips = [{ id: "t1", title: "Costa Vicentina", startDate: "2099-10-02", endDate: "2099-10-09", tripTotalDays: 8 }];
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: { limited: true, used: 2, limit: 2 } });

  renderPage("/packing-checklist?forTrip=t1");

  expect(await screen.findByText(/packingChecklist.listCapTitle/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "packingChecklist.createList" })).not.toBeInTheDocument();
});

it("says on each card which trip it is for", async () => {
  getPackingLists.mockResolvedValue({ lists: [{ id: "l1", name: "Equipaje", itemCount: 0, checkedCount: 0, itinerary: { id: "t1", title: "Costa Vicentina" } }], freeTierUsage: FREE_USAGE });

  renderPage();

  expect(await screen.findByText("packingChecklist.forTrip:Costa Vicentina")).toBeInTheDocument();
});

