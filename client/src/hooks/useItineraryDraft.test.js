import { act, renderHook } from "@testing-library/react";
import { itineraryDraftKey, serializeItineraryDraft } from "@tobeatraveller/shared";
import { useItineraryDraft } from "./useItineraryDraft";

const draft = { values: { title: "Ruta por Portugal", destination: { name: "Lisboa" }, places: [] }, days: [1], step: 0 };
const storeDraft = (userId) => localStorage.setItem(itineraryDraftKey(userId), serializeItineraryDraft(draft));

describe("useItineraryDraft", () => {
  beforeEach(() => localStorage.clear());

  it("finds what was left unfinished by that account", () => {
    storeDraft("user-1");

    const { result } = renderHook(() => useItineraryDraft("user-1"));

    expect(result.current.pendingDraft.values.title).toBe("Ruta por Portugal");
  });

  it("finds nothing when there is nothing", () => {
    const { result } = renderHook(() => useItineraryDraft("user-1"));

    expect(result.current.pendingDraft).toBeNull();
  });

  it("stops offering it once the person has decided", () => {
    storeDraft("user-1");
    const { result } = renderHook(() => useItineraryDraft("user-1"));

    act(() => result.current.resolvePending());

    expect(result.current.pendingDraft).toBeNull();
  });

  // Regression-in-waiting: with the account arriving late, the draft was never looked for and was then saved over.
  it("finds the draft when the account arrives after the first render", () => {
    storeDraft("user-1");
    const { result, rerender } = renderHook(({ userId }) => useItineraryDraft(userId), { initialProps: { userId: undefined } });
    expect(result.current.pendingDraft).toBeNull();

    rerender({ userId: "user-1" });

    expect(result.current.pendingDraft.values.title).toBe("Ruta por Portugal");
  });

  it("saves nothing while there is no account", () => {
    const { result } = renderHook(() => useItineraryDraft(undefined));

    act(() => result.current.save(draft));

    expect(localStorage.length).toBe(0);
  });

  it("never offers one account the draft of another when the account changes", () => {
    storeDraft("user-1");
    const { result, rerender } = renderHook(({ userId }) => useItineraryDraft(userId), { initialProps: { userId: "user-1" } });
    expect(result.current.pendingDraft).not.toBeNull();

    rerender({ userId: "user-2" });

    expect(result.current.pendingDraft).toBeNull();
  });

  // Regression: the form stayed on screen while the published trip's page loaded, kept autosaving,
  // and the trip came back as "unfinished" in Home and in Create trip.
  it("does not bring a published trip back as a draft when the form saves once more", () => {
    const { result } = renderHook(() => useItineraryDraft("user-1"));
    act(() => result.current.save(draft));

    act(() => result.current.finish());
    act(() => result.current.save(draft));

    expect(localStorage.getItem(itineraryDraftKey("user-1"))).toBeNull();
  });

  it("keeps saving after a draft was merely cleared, since the person can start writing again", () => {
    const { result } = renderHook(() => useItineraryDraft("user-1"));

    act(() => result.current.clear());
    act(() => result.current.save(draft));

    expect(localStorage.getItem(itineraryDraftKey("user-1"))).not.toBeNull();
  });
});
