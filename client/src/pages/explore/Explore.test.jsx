import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, useLocation } from "react-router-dom";

const mockDispatch = jest.fn(() => Promise.resolve());
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: "es" } }) }));
jest.mock("../../store/auth/authSelectors.js", () => ({ selectIsAuthenticated: () => true }));
jest.mock("../../hooks/usePageMeta.js", () => ({ usePageMeta: jest.fn() }));
jest.mock("../../components/home/WorldMap.jsx", () => () => <div data-testid="world-map" />);
jest.mock("../../components/filters/Filters.jsx", () => ({ onChange }) => (
  <>
    <button type="button" onClick={() => onChange({})}>reset filters</button>
    <button type="button" onClick={() => onChange({ query: "Lisbon", category: "roadtrip" })}>search Lisbon</button>
  </>
));
jest.mock("../../components/itineraries/ItinerariesSection.jsx", () => () => null);
jest.mock("../../components/LoadingButton.jsx", () => () => null);
jest.mock("@tobeatraveller/shared", () => ({
  initExploreItineraries: jest.fn((params) => ({ type: "init-explore", params })),
  loadMoreExploreItineraries: jest.fn(),
  setExplorePagination: jest.fn(),
  selectExploreItineraries: () => [],
  selectExploreItinerariesError: () => null,
  selectExploreItinerariesLoading: () => false,
  selectExploreItinerariesLoadingMore: () => false,
  selectExplorePage: () => 1,
  selectExploreTotalItems: () => 0,
  selectExploreTotalPages: () => 1,
  formatNumber: (value) => String(value),
  itineraryCategories: [{ value: "roadtrip" }, { value: "relax" }],
}));

import Explore from "./Explore";

const AddressProbe = () => {
  const { pathname, search } = useLocation();
  return <span data-testid="address">{pathname}{search}</span>;
};

const renderExplore = (path = "/explore") => render(
  <MemoryRouter initialEntries={[path]}>
    <Link to="/explore?location=Lisboa">pick Lisboa on the map</Link>
    <AddressProbe />
    <Explore />
  </MemoryRouter>,
);

beforeEach(() => jest.clearAllMocks());

describe("Explore: the map", () => {
  it("offers the world map to whoever has not searched yet", () => {
    renderExplore();

    expect(screen.getByTestId("world-map")).toBeInTheDocument();
  });

  it("lets them hide it, and show it again", () => {
    renderExplore();

    fireEvent.click(screen.getByRole("button", { name: "explore.hideMap" }));
    expect(screen.queryByTestId("world-map")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "explore.showMap" }));

    expect(screen.getByTestId("world-map")).toBeInTheDocument();
  });

  it("steps aside once they search, so the results are what they see", () => {
    renderExplore("/explore?location=Lisboa");

    expect(screen.queryByTestId("world-map")).not.toBeInTheDocument();
  });

  // Regression-in-waiting: a pin on the map goes to /explore?location=..., which when already
  // on Explore is the same page: nothing happened.
  it("searches the destination chosen on the map while already on the page", () => {
    renderExplore();

    fireEvent.click(screen.getByRole("link", { name: "pick Lisboa on the map" }));

    expect(mockDispatch).toHaveBeenCalledWith({ type: "init-explore", params: expect.objectContaining({ query: "Lisboa" }) });
    expect(screen.queryByTestId("world-map")).not.toBeInTheDocument();
  });

  // Regression-in-waiting: after clearing the filters the address still said Lisboa, so the same pin was the same address.
  it("searches the same destination again when it is chosen again after clearing the filters", () => {
    renderExplore("/explore?location=Lisboa");
    fireEvent.click(screen.getByRole("button", { name: "reset filters" }));
    expect(screen.getByTestId("world-map")).toBeInTheDocument();
    mockDispatch.mockClear();

    fireEvent.click(screen.getByRole("link", { name: "pick Lisboa on the map" }));

    expect(mockDispatch).toHaveBeenCalledWith({ type: "init-explore", params: expect.objectContaining({ query: "Lisboa" }) });
  });
});

describe("Explore: trips by van", () => {
  it("asks for them when the address says so, and shows the filter as on", () => {
    renderExplore("/explore?van=true");

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "init-explore",
      params: expect.objectContaining({ byVan: "true" }),
    });
    expect(screen.getByText(/tripByVan.label/)).toBeInTheDocument();
  });

  it("drops only the van filter from its chip and from the address", () => {
    renderExplore("/explore?van=true&category=roadtrip");

    fireEvent.click(screen.getAllByRole("button", { name: "explore.removeFilter" })[0]);

    expect(screen.getByTestId("address")).not.toHaveTextContent("van=true");
    expect(screen.getByTestId("address")).toHaveTextContent("category=roadtrip");
  });
});

describe("Explore: dropping one filter", () => {
  it("drops only the chip that was pressed and keeps the rest of the search", () => {
    renderExplore();
    fireEvent.click(screen.getByRole("button", { name: "search Lisbon" }));

    fireEvent.click(screen.getAllByRole("button", { name: "explore.removeFilter" })[1]);

    expect(screen.getByTestId("address")).toHaveTextContent("location=Lisbon");
    expect(screen.getByTestId("address")).not.toHaveTextContent("category=roadtrip");
  });
});

describe("Explore: filters and sort in the address", () => {
  it("opens as it was left: the filters and the sort come from the address", () => {
    renderExplore("/explore?category=roadtrip&budgetMax=500&sort=cheapest");

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "init-explore",
      params: expect.objectContaining({ category: "roadtrip", budgetMax: "500", sortBy: "cheapest" }),
    });
  });

  it("writes the sort to the address, so going back from a trip finds it", () => {
    renderExplore();

    fireEvent.click(screen.getByRole("button", { name: "explore.sortLiked" }));

    expect(screen.getByTestId("address")).toHaveTextContent("/explore?sort=liked");
  });

  it("writes a search to the address and keeps what else the address carried", () => {
    renderExplore("/explore?utm_source=newsletter");

    fireEvent.click(screen.getByRole("button", { name: "search Lisbon" }));

    expect(screen.getByTestId("address")).toHaveTextContent("utm_source=newsletter");
    expect(screen.getByTestId("address")).toHaveTextContent("location=Lisbon");
    expect(screen.getByTestId("address")).toHaveTextContent("category=roadtrip");
  });

  // The router can show the page's own write of the address after the filters have moved on (typing
  // fast): taking it for a destination chosen on the map would put the old search back.
  it("does not take its own late change of the address for a destination chosen on the map", () => {
    render(
      <MemoryRouter initialEntries={["/explore"]}>
        <Link to="/explore?location=Faro" state={{ exploreAddressSync: true }}>late write of the address</Link>
        <Explore />
      </MemoryRouter>,
    );
    mockDispatch.mockClear();

    fireEvent.click(screen.getByRole("link", { name: "late write of the address" }));

    expect(mockDispatch).not.toHaveBeenCalledWith({ type: "init-explore", params: expect.objectContaining({ query: "Faro" }) });
  });
});
