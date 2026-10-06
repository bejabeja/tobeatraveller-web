import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { itineraryDraftKey, serializeItineraryDraft } from "@tobeatraveller/shared";

let mockAuthUser = { id: "user-1" };

jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));
jest.mock("../../../store/auth/authSelectors", () => ({ selectAuthUser: () => mockAuthUser }));
jest.mock("../../../store/user/userInfoSelectors", () => ({ selectMe: () => ({ id: "user-1" }) }));
jest.mock("../../../store/user/userInfoActions", () => ({ setUserInfo: jest.fn(), setUserInfoItineraries: jest.fn() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
    i18n: { resolvedLanguage: "en" },
  }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: Object.assign(jest.fn(), { error: jest.fn(), promise: jest.fn() }) }));
jest.mock("../../../services/itinerary", () => ({ createItinerary: jest.fn() }));
jest.mock("../../../utils/analytics", () => ({ trackEvent: jest.fn() }));

// The sections are other tests' business: only the title is needed here, wired to the form like the real one.
jest.mock("../sectionsForm/BasicInfoForm", () => {
  const React = require("react");
  const { useController } = require("react-hook-form");
  return {
    __esModule: true,
    default: ({ control }) => {
      const { field } = useController({ control, name: "title" });
      return React.createElement("input", { "aria-label": "title", ...field });
    },
  };
});
jest.mock("../sectionsForm/BudgetForm", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/DatesForm", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/GalleryUpload", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/ImageUpload", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/PlacesForm", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/TravellersForm", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/VisibilityForm", () => ({ __esModule: true, default: () => null }));

import CreateItinerary from "./CreateItinerary";

const SAVED_AT = new Date("2026-09-20T10:00:00Z");
const SAVE_PAUSE_MS = 700;

const storeDraft = (userId, { title = "Ruta por Portugal", step = 0, isPublic } = {}) => localStorage.setItem(
  itineraryDraftKey(userId),
  serializeItineraryDraft({ values: { title, destination: { name: "Lisboa" }, places: [], isPublic }, days: [1, 2], step, pace: "relaxed" }, SAVED_AT),
);
const storedDraftOf = (userId) => JSON.parse(localStorage.getItem(itineraryDraftKey(userId)));

const renderPage = () => render(<MemoryRouter><CreateItinerary /></MemoryRouter>);

describe("CreateItinerary draft", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-01T10:00:00Z"));
    localStorage.clear();
    mockAuthUser = { id: "user-1" };
  });
  afterEach(() => jest.useRealTimers());

  it("opens straight on the form when there is nothing unfinished", () => {
    renderPage();

    expect(screen.getByLabelText("title")).toBeInTheDocument();
    expect(screen.queryByText("createItinerary.draftTitle")).not.toBeInTheDocument();
  });

  it("offers to continue an unfinished trip, saying which one and when, instead of showing an empty form", () => {
    storeDraft("user-1");
    renderPage();

    expect(screen.getByText("createItinerary.draftTitle")).toBeInTheDocument();
    expect(screen.getByText(/Ruta por Portugal/)).toBeInTheDocument();
    expect(screen.getByText(/Sep 20, 2026/)).toBeInTheDocument();
    expect(screen.getByText("createItinerary.draftNote")).toBeInTheDocument();
    expect(screen.queryByLabelText("title")).not.toBeInTheDocument();
  });

  it("brings back what was written when the person continues", () => {
    storeDraft("user-1");
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "createItinerary.draftContinue" }));

    expect(screen.getByLabelText("title")).toHaveValue("Ruta por Portugal");
    expect(screen.queryByText("createItinerary.draftTitle")).not.toBeInTheDocument();
  });

  it("starts from nothing, and forgets the draft, when the person starts a new one", () => {
    storeDraft("user-1");
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "createItinerary.draftDiscard" }));

    expect(screen.getByLabelText("title")).toHaveValue("");
    expect(localStorage.getItem(itineraryDraftKey("user-1"))).toBeNull();
  });

  it("does not offer the unfinished trip of another account", () => {
    storeDraft("user-2");
    renderPage();

    expect(screen.getByLabelText("title")).toBeInTheDocument();
    expect(screen.queryByText("createItinerary.draftTitle")).not.toBeInTheDocument();
  });

  it("saves what is being written after a short pause, so closing the tab loses almost nothing", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("title"), { target: { value: "Ruta por Galicia" } });
    expect(storedDraftOf("user-1")).toBeNull();
    act(() => { jest.advanceTimersByTime(SAVE_PAUSE_MS); });

    expect(storedDraftOf("user-1").values.title).toBe("Ruta por Galicia");
  });

  it("saves nothing for a form nobody touched", () => {
    renderPage();

    act(() => { jest.advanceTimersByTime(SAVE_PAUSE_MS); });

    expect(localStorage.getItem(itineraryDraftKey("user-1"))).toBeNull();
  });

  // Regression-in-waiting: the empty form must not overwrite the trip waiting to be continued.
  it("keeps the unfinished trip untouched while the person decides", () => {
    storeDraft("user-1");
    renderPage();

    act(() => { jest.advanceTimersByTime(SAVE_PAUSE_MS * 3); });

    expect(storedDraftOf("user-1").values.title).toBe("Ruta por Portugal");
  });

  it("forgets the draft when the person cancels and confirms discarding what they wrote", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("title"), { target: { value: "Ruta por Galicia" } });
    act(() => { jest.advanceTimersByTime(SAVE_PAUSE_MS); });
    expect(storedDraftOf("user-1")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "common.discard" }));

    expect(localStorage.getItem(itineraryDraftKey("user-1"))).toBeNull();
  });
});

describe("CreateItinerary: days without places", () => {
  const continueDraft = (draft) => {
    storeDraft("user-1", { step: 4, ...draft });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "createItinerary.draftContinue" }));
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-01T10:00:00Z"));
    localStorage.clear();
  });
  afterEach(() => jest.useRealTimers());

  // Regression-in-waiting: it was only found out as a refusal after pressing the button to publish.
  it("says before publishing which days have no places", () => {
    continueDraft({ isPublic: true });

    expect(screen.getByRole("status")).toHaveTextContent('createItinerary.emptyDaysDesc:{"days":"1, 2","count":2}');
  });

  it("says nothing for a private trip, which does not need them", () => {
    continueDraft({ isPublic: false });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
