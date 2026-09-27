import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let mockTrips = [];
let mockTripsLoaded = true;
jest.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join("/")}` : key) }),
}));
jest.mock("../../store/user/userInfoSelectors", () => ({
  selectMyItineraries: () => mockTrips,
  selectMyItinerariesLoaded: () => mockTripsLoaded,
}));

import NextTrip from "./NextTrip";

const renderNextTrip = () => render(<MemoryRouter><NextTrip /></MemoryRouter>);

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 27, 10));
  mockTripsLoaded = true;
});
afterEach(() => jest.useRealTimers());

it("shows the trip under way and which day of it this is", () => {
  mockTrips = [{ id: "t1", title: "Fiordos", location: { name: "Noruega" }, startDate: "2026-09-25", endDate: "2026-10-01" }];

  renderNextTrip();

  const card = screen.getByRole("link", { name: /Fiordos/ });
  expect(card).toHaveAttribute("href", "/itinerary/t1");
  expect(card).toHaveTextContent("home.onTripLabel");
  expect(card).toHaveTextContent("home.onTripDay:3/7 · Noruega");
});

it("counts down to the next trip", () => {
  mockTrips = [{ id: "t2", title: "Lisboa", location: { name: "Portugal" }, startDate: "2026-10-02", endDate: "2026-10-05" }];

  renderNextTrip();

  expect(screen.getByRole("link", { name: /Lisboa/ })).toHaveTextContent("home.nextTripLabel");
  expect(screen.getByRole("link", { name: /Lisboa/ })).toHaveTextContent("home.nextTripIn:5");
});

it("invites to plan one when there is no trip ahead", () => {
  mockTrips = [{ id: "t3", title: "Roma", startDate: "2026-08-01", endDate: "2026-08-04" }];

  renderNextTrip();

  expect(screen.getByText("home.noNextTrip")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "home.planTrip" })).toHaveAttribute("href", "/create-itinerary");
});

it("waits for the trips before inviting to plan one", () => {
  mockTrips = [];
  mockTripsLoaded = false;

  const { container } = renderNextTrip();

  expect(container).toBeEmptyDOMElement();
});
