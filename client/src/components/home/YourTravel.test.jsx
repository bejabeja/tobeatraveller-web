import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, vars) => (vars?.count !== undefined ? `${key}:${vars.count}` : key) }) }));
jest.mock("../../hooks/useUserPassport", () => ({ useUserPassport: jest.fn() }));
jest.mock("../../utils/itineraryDraftStorage", () => ({ readItineraryDraft: jest.fn() }));

import { useUserPassport } from "../../hooks/useUserPassport";
import { readItineraryDraft } from "../../utils/itineraryDraftStorage";
import YourTravel from "./YourTravel";

const PASSPORT = { countries: [{ code: "PT" }, { code: "ES" }], achievements: [{ id: "a", earnedAt: "2026-09-01" }, { id: "b", earnedAt: null }] };
const draftOf = (savedAt, values) => ({ savedAt: new Date(savedAt), values });

const renderCard = () => render(<MemoryRouter><YourTravel userId="u1" /></MemoryRouter>);

beforeEach(() => {
  jest.clearAllMocks();
  useUserPassport.mockReturnValue({ passport: PASSPORT });
  readItineraryDraft.mockReturnValue(null);
});

describe("YourTravel", () => {
  it("shows where the passport stands and links to it", () => {
    renderCard();

    expect(screen.getByText("passport.countriesCount:2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /passport.title/ })).toHaveAttribute("href", "/profile/u1/passport");
    expect(screen.queryByText("home.draftLabel")).not.toBeInTheDocument();
  });

  // Regression-in-waiting: a trip left half done was only found by opening the form again, by chance.
  it("offers to pick up a trip left unfinished, by its title", () => {
    readItineraryDraft.mockImplementation((_, kind) => (kind === "itinerary" ? draftOf("2026-10-01", { title: "Algarve" }) : null));

    renderCard();

    expect(screen.getByRole("link", { name: /Algarve/ })).toHaveAttribute("href", "/create-itinerary");
  });

  it("sends an AI plan left unfinished back to the AI plan, not to the form", () => {
    readItineraryDraft.mockImplementation((_, kind) => (kind === "experience" ? draftOf("2026-10-01", { destination: { name: "Lisboa" } }) : null));

    renderCard();

    expect(screen.getByRole("link", { name: /Lisboa/ })).toHaveAttribute("href", "/create-experience");
  });

  it("says a trip without a title yet is unnamed", () => {
    readItineraryDraft.mockImplementation((_, kind) => (kind === "itinerary" ? draftOf("2026-10-01", { places: [{}] }) : null));

    renderCard();

    expect(screen.getByText("home.draftUnnamed")).toBeInTheDocument();
  });

  it("invites to start the passport when there are no countries yet", () => {
    useUserPassport.mockReturnValue({ passport: { countries: [], achievements: [] } });

    renderCard();

    expect(screen.getByText("passport.noCountriesYet")).toBeInTheDocument();
  });

  it("shows nothing while there is neither a draft nor a passport", () => {
    useUserPassport.mockReturnValue({ passport: null });

    const { container } = renderCard();

    expect(container).toBeEmptyDOMElement();
  });
});
