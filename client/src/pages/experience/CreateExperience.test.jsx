import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ITINERARY_DRAFT_KINDS, itineraryDraftKey, serializeItineraryDraft } from "@tobeatraveller/shared";

let mockMe = { id: "user-1", isPremium: true };

jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));
jest.mock("../../store/auth/authSelectors", () => ({ selectAuthUser: () => ({ id: "user-1" }) }));
jest.mock("../../store/user/userInfoSelectors", () => ({ selectMe: () => mockMe }));
jest.mock("../../store/user/userInfoActions", () => ({ setUserInfo: jest.fn(), setUserInfoItineraries: jest.fn() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
    i18n: { resolvedLanguage: "en", language: "en" },
  }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));
jest.mock("../../services/itineraries", () => ({ GENERATE_TIMEOUT_MESSAGE: "timeout", generateSmartItinerary: jest.fn() }));
jest.mock("../../services/itinerary", () => ({ createItinerary: jest.fn() }));
jest.mock("../../hooks/useGeocodeSearch", () => ({ useGeocodeSearch: () => ({ searchDestinations: jest.fn(), reverseGeocode: jest.fn() }) }));
jest.mock("../../hooks/useCurrentLocation", () => ({
  useCurrentLocation: () => ({ getCurrentLocation: jest.fn(), getLocationIfPermitted: jest.fn(), loading: false }),
}));
jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../components/featureLoadState/FeatureLoadState", () => () => "premium-gate");
jest.mock("../../components/modal/Modal", () => () => null);
jest.mock("../../components/form/UseCurrentLocationButton", () => () => null);
jest.mock("../itinerary/sectionsForm/ImageUpload", () => () => null);
jest.mock("./ExperienceStartDate", () => () => null);

import CreateExperience from "./CreateExperience";

const SAVED_AT = new Date("2026-09-20T10:00:00Z");
const SAVE_PAUSE_MS = 700;
const AI_PLAN = ITINERARY_DRAFT_KINDS.AI_PLAN;
const FORM = ITINERARY_DRAFT_KINDS.FORM;

const STEP = { _key: "s1", name: "Praia da Bordeira", description: "Una playa", category: "beach", dayNumber: 1, lat: 1, lon: 2, mood: null, personalNote: "" };

const storeDraft = (userId, kind, { step = 1, title = "Ruta por Portugal", places = [STEP] } = {}) => localStorage.setItem(
  itineraryDraftKey(userId, kind),
  serializeItineraryDraft({
    values: { title, destination: { name: "Lisboa", label: "Lisboa, Portugal", coordinates: { lat: 38, lon: -9 } }, destQuery: "Lisboa", days: 3, startDate: null, category: "relax", travelers: 2, intention: "Surf", isPublic: false, places },
    step,
    pace: "relaxed",
  }, SAVED_AT),
);
const storedDraftOf = (userId, kind) => JSON.parse(localStorage.getItem(itineraryDraftKey(userId, kind)));

const renderPage = () => render(<MemoryRouter><CreateExperience /></MemoryRouter>);

describe("CreateExperience draft", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-01T10:00:00Z"));
    localStorage.clear();
    mockMe = { id: "user-1", isPremium: true };
  });
  afterEach(() => jest.useRealTimers());

  it("opens straight on the form when there is nothing unfinished", () => {
    renderPage();

    expect(screen.getByText("createExperience.heroInput")).toBeInTheDocument();
    expect(screen.queryByText("createItinerary.draftTitle")).not.toBeInTheDocument();
  });

  it("offers to continue the plan the AI wrote, instead of an empty form", () => {
    storeDraft("user-1", AI_PLAN);
    renderPage();

    expect(screen.getByText("createItinerary.draftTitle")).toBeInTheDocument();
    expect(screen.getByText(/Ruta por Portugal/)).toBeInTheDocument();
    expect(screen.queryByText("createExperience.heroInput")).not.toBeInTheDocument();
  });

  it("brings the plan back on the review screen, with what the person had written", () => {
    storeDraft("user-1", AI_PLAN);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "createItinerary.draftContinue" }));

    expect(screen.getByText("createExperience.heroReview")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("createExperience.namePlaceholder")).toHaveValue("Ruta por Portugal");
  });

  it("brings back what was chosen, on the first screen, when no plan had been written yet", () => {
    storeDraft("user-1", AI_PLAN, { step: 0, places: [] });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "createItinerary.draftContinue" }));

    expect(screen.getByText("createExperience.heroInput")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("createExperience.destPlaceholder")).toHaveValue("Lisboa");
  });

  it("starts from nothing, and forgets the draft, when the person starts a new one", () => {
    storeDraft("user-1", AI_PLAN);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "createItinerary.draftDiscard" }));

    expect(screen.getByText("createExperience.heroInput")).toBeInTheDocument();
    expect(localStorage.getItem(itineraryDraftKey("user-1", AI_PLAN))).toBeNull();
  });

  // Regression-in-waiting: each way of starting a trial keeps its own, or one would offer the other's.
  it("does not offer what was left in the other form", () => {
    storeDraft("user-1", FORM);
    renderPage();

    expect(screen.queryByText("createItinerary.draftTitle")).not.toBeInTheDocument();
    expect(screen.getByText("createExperience.heroInput")).toBeInTheDocument();
  });

  it("does not offer the unfinished plan of another account", () => {
    storeDraft("user-2", AI_PLAN);
    renderPage();

    expect(screen.queryByText("createItinerary.draftTitle")).not.toBeInTheDocument();
  });

  it("saves the plan as it is edited, so closing the tab does not lose what a generation cost", () => {
    storeDraft("user-1", AI_PLAN);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "createItinerary.draftContinue" }));

    fireEvent.change(screen.getByPlaceholderText("createExperience.namePlaceholder"), { target: { value: "Ruta por el Algarve" } });
    act(() => { jest.advanceTimersByTime(SAVE_PAUSE_MS); });

    const saved = storedDraftOf("user-1", AI_PLAN);
    expect(saved.values.title).toBe("Ruta por el Algarve");
    expect(saved.values.places).toHaveLength(1);
    expect(saved.step).toBe(1);
  });

  it("saves nothing for a form nobody touched", () => {
    renderPage();

    act(() => { jest.advanceTimersByTime(SAVE_PAUSE_MS); });

    expect(localStorage.getItem(itineraryDraftKey("user-1", AI_PLAN))).toBeNull();
  });

  it("keeps the unfinished plan untouched while the person decides", () => {
    storeDraft("user-1", AI_PLAN);
    renderPage();

    act(() => { jest.advanceTimersByTime(SAVE_PAUSE_MS * 3); });

    expect(storedDraftOf("user-1", AI_PLAN).values.title).toBe("Ruta por Portugal");
  });

  // Regression-in-waiting: a Premium that ended must not cost the plan that was already written.
  it("does not throw the draft away when the account is no longer Premium", () => {
    mockMe = { id: "user-1", isPremium: false };
    storeDraft("user-1", AI_PLAN);
    renderPage();

    act(() => { jest.advanceTimersByTime(SAVE_PAUSE_MS * 3); });

    expect(screen.getByText("premium-gate")).toBeInTheDocument();
    expect(storedDraftOf("user-1", AI_PLAN)).not.toBeNull();
  });
});

describe("CreateExperience: trips by van", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-01T10:00:00Z"));
    localStorage.clear();
    mockMe = { id: "user-1", isPremium: true };
  });
  afterEach(() => jest.useRealTimers());

  const byVanBox = () => screen.getByRole("checkbox", { name: /tripByVan.question/ });

  // Regression-in-waiting: almost nobody would tick it, and the van filter in Explore would be empty.
  it("starts marked as by van for whoever said they live in a van", () => {
    mockMe = { id: "user-1", isPremium: true, travelStyle: "van" };
    renderPage();

    expect(byVanBox()).toBeChecked();
  });

  it("starts unmarked for everyone else", () => {
    renderPage();

    expect(byVanBox()).not.toBeChecked();
  });

  it("respects the answer of someone who lives in a van and says this trip was not by van", () => {
    mockMe = { id: "user-1", isPremium: true, travelStyle: "van" };
    renderPage();

    fireEvent.click(byVanBox());

    expect(byVanBox()).not.toBeChecked();
  });

  it("keeps the answer in the draft, so it is there when the plan is brought back", () => {
    storeDraft("user-1", AI_PLAN);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "createItinerary.draftContinue" }));

    fireEvent.click(byVanBox());
    act(() => { jest.advanceTimersByTime(SAVE_PAUSE_MS); });

    expect(storedDraftOf("user-1", AI_PLAN).values.byVan).toBe(true);
  });
});
