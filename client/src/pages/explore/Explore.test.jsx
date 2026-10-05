import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";

const mockDispatch = jest.fn(() => Promise.resolve());
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: "es" } }) }));
jest.mock("../../store/auth/authSelectors.js", () => ({ selectIsAuthenticated: () => true }));
jest.mock("../../hooks/usePageMeta.js", () => ({ usePageMeta: jest.fn() }));
jest.mock("../../components/home/WorldMap.jsx", () => () => <div data-testid="world-map" />);
jest.mock("../../components/filters/Filters.jsx", () => ({ onChange }) => <button type="button" onClick={() => onChange({})}>reset filters</button>);
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
}));

import Explore from "./Explore";

const renderExplore = (path = "/explore") => render(
  <MemoryRouter initialEntries={[path]}>
    <Link to="/explore?location=Lisboa">pick Lisboa on the map</Link>
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
