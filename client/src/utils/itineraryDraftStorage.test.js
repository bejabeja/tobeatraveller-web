import { ITINERARY_DRAFT_KINDS, itineraryDraftKey, serializeItineraryDraft } from "@tobeatraveller/shared";
import {
  clearAllItineraryDrafts,
  clearItineraryDraft,
  readItineraryDraft,
  saveItineraryDraft,
} from "./itineraryDraftStorage";

const draft = { values: { title: "Ruta por Portugal", destination: { name: "Lisboa" }, places: [] }, days: [1], step: 1, pace: "relaxed" };

describe("itineraryDraftStorage", () => {
  beforeEach(() => localStorage.clear());

  it("gives back the draft that was saved for that account", () => {
    saveItineraryDraft("user-1", draft);

    expect(readItineraryDraft("user-1")).toMatchObject({ values: draft.values, days: [1], step: 1, pace: "relaxed" });
  });

  it("never offers one account the draft of another", () => {
    saveItineraryDraft("user-1", draft);

    expect(readItineraryDraft("user-2")).toBeNull();
  });

  it("forgets a draft once it is cleared", () => {
    saveItineraryDraft("user-1", draft);

    clearItineraryDraft("user-1");

    expect(readItineraryDraft("user-1")).toBeNull();
  });

  it("is no draft when what is stored is damaged", () => {
    localStorage.setItem(itineraryDraftKey("user-1"), "{not json");

    expect(readItineraryDraft("user-1")).toBeNull();
  });

  // Regression-in-waiting: signing out on a shared device must not leave a stranger's trip behind.
  it("removes the drafts of every account on signing out, and nothing else", () => {
    saveItineraryDraft("user-1", draft);
    saveItineraryDraft("user-2", draft);
    localStorage.setItem("i18nextLng", "es");

    clearAllItineraryDrafts();

    expect(readItineraryDraft("user-1")).toBeNull();
    expect(readItineraryDraft("user-2")).toBeNull();
    expect(localStorage.getItem("i18nextLng")).toBe("es");
  });

  describe("when the browser refuses to store anything", () => {
    beforeEach(() => {
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError"); });
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("SecurityError"); });
    });
    afterEach(() => jest.restoreAllMocks());

    it("neither saving nor reading breaks the page", () => {
      expect(() => saveItineraryDraft("user-1", draft)).not.toThrow();
      expect(readItineraryDraft("user-1")).toBeNull();
    });
  });

  // Regression-in-waiting: it stopped being offered after 30 days but stayed on the device, against what the policy says.
  it("removes a draft that is too old from the device, not only stops offering it", () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    localStorage.setItem(itineraryDraftKey("user-1"), serializeItineraryDraft(draft, old));

    expect(readItineraryDraft("user-1")).toBeNull();
    expect(localStorage.getItem(itineraryDraftKey("user-1"))).toBeNull();
  });

  it("removes a damaged draft from the device", () => {
    localStorage.setItem(itineraryDraftKey("user-1"), "{not json");

    readItineraryDraft("user-1");

    expect(localStorage.getItem(itineraryDraftKey("user-1"))).toBeNull();
  });

  it("keeps a draft that is recent enough", () => {
    const recent = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    localStorage.setItem(itineraryDraftKey("user-1"), serializeItineraryDraft(draft, recent));

    expect(readItineraryDraft("user-1")).not.toBeNull();
    expect(localStorage.getItem(itineraryDraftKey("user-1"))).not.toBeNull();
  });

  it("keeps the draft of the form apart from the one of the AI plan", () => {
    saveItineraryDraft("user-1", draft, ITINERARY_DRAFT_KINDS.AI_PLAN);

    expect(readItineraryDraft("user-1", ITINERARY_DRAFT_KINDS.AI_PLAN)).not.toBeNull();
    expect(readItineraryDraft("user-1", ITINERARY_DRAFT_KINDS.FORM)).toBeNull();
    expect(readItineraryDraft("user-1")).toBeNull();
  });

  it("forgets only the kind that is cleared", () => {
    saveItineraryDraft("user-1", draft);
    saveItineraryDraft("user-1", draft, ITINERARY_DRAFT_KINDS.AI_PLAN);

    clearItineraryDraft("user-1", ITINERARY_DRAFT_KINDS.AI_PLAN);

    expect(readItineraryDraft("user-1")).not.toBeNull();
    expect(readItineraryDraft("user-1", ITINERARY_DRAFT_KINDS.AI_PLAN)).toBeNull();
  });

  it("removes the drafts of both kinds on signing out", () => {
    saveItineraryDraft("user-1", draft);
    saveItineraryDraft("user-1", draft, ITINERARY_DRAFT_KINDS.AI_PLAN);

    clearAllItineraryDrafts();

    expect(readItineraryDraft("user-1")).toBeNull();
    expect(readItineraryDraft("user-1", ITINERARY_DRAFT_KINDS.AI_PLAN)).toBeNull();
  });

  it("keeps a draft that was written by hand in the format the app uses", () => {
    localStorage.setItem(itineraryDraftKey("user-1"), serializeItineraryDraft(draft));

    expect(readItineraryDraft("user-1")).not.toBeNull();
  });
});
