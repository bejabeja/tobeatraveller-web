import { act, renderHook, waitFor } from "@testing-library/react";
import { useAchievementCelebrations } from "./useAchievementCelebrations";

jest.mock("../services/notifications", () => ({ fetchNotifications: jest.fn() }));

import { fetchNotifications } from "../services/notifications";

const badge = (id, badgeId) => ({ id, type: "badge_earned", isRead: false, badgeId, countryCode: null });
const stamp = (id, countryCode) => ({ id, type: "country_stamp", isRead: false, badgeId: null, countryCode });

describe("useAchievementCelebrations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("celebrates the new badges and countries among the unread notifications, the oldest first", async () => {
    fetchNotifications.mockResolvedValue({ notifications: [badge("n2", "countries_5"), stamp("n1", "PT")] });

    const { result } = renderHook(() => useAchievementCelebrations("user-1", 2));

    await waitFor(() => expect(result.current.celebration).not.toBeNull());
    expect(result.current.celebration.moment).toEqual({ kind: "country", code: "PT" });
    expect(result.current).toMatchObject({ position: 1, total: 2 });
  });

  it("moves on to the next celebration, then to none", async () => {
    fetchNotifications.mockResolvedValue({ notifications: [badge("n2", "countries_5"), stamp("n1", "PT")] });
    const { result } = renderHook(() => useAchievementCelebrations("user-1", 2));
    await waitFor(() => expect(result.current.celebration).not.toBeNull());

    act(() => result.current.dismiss());
    expect(result.current.celebration.moment).toEqual({ kind: "badge", code: "countries_5" });
    expect(result.current).toMatchObject({ position: 2, total: 2 });

    act(() => result.current.dismiss());
    expect(result.current.celebration).toBeNull();
  });

  it("drops the remaining celebrations at once, when the user goes to share one", async () => {
    fetchNotifications.mockResolvedValue({ notifications: [badge("n2", "countries_5"), stamp("n1", "PT")] });
    const { result } = renderHook(() => useAchievementCelebrations("user-1", 2));
    await waitFor(() => expect(result.current.celebration).not.toBeNull());

    act(() => result.current.dismissAll());

    expect(result.current.celebration).toBeNull();
  });

  it("does not celebrate again what this browser already celebrated", async () => {
    fetchNotifications.mockResolvedValue({ notifications: [stamp("n1", "PT")] });
    const first = renderHook(() => useAchievementCelebrations("user-1", 1));
    await waitFor(() => expect(first.result.current.celebration).not.toBeNull());
    first.unmount();

    const { result } = renderHook(() => useAchievementCelebrations("user-1", 1));

    await waitFor(() => expect(fetchNotifications).toHaveBeenCalledTimes(2));
    expect(result.current.celebration).toBeNull();
  });

  it("checks again when the unread count changes, and adds only what is new", async () => {
    fetchNotifications.mockResolvedValueOnce({ notifications: [stamp("n1", "PT")] });
    const { result, rerender } = renderHook(({ unread }) => useAchievementCelebrations("user-1", unread), { initialProps: { unread: 1 } });
    await waitFor(() => expect(result.current.total).toBe(1));

    fetchNotifications.mockResolvedValueOnce({ notifications: [badge("n2", "countries_5"), stamp("n1", "PT")] });
    rerender({ unread: 2 });

    await waitFor(() => expect(result.current.total).toBe(2));
    expect(result.current.celebration.moment).toEqual({ kind: "country", code: "PT" });
  });

  // Opened from its notification, the card of that badge or country is
  // already on screen: celebrating it on top would stack two screens.
  it("skips the celebration of a moment whose card the user is already opening", async () => {
    fetchNotifications.mockResolvedValue({ notifications: [badge("n2", "countries_5"), stamp("n1", "PT")] });
    const { result } = renderHook(() => useAchievementCelebrations("user-1", 2));

    act(() => result.current.skip({ kind: "country", code: "PT" }));

    await waitFor(() => expect(result.current.celebration).not.toBeNull());
    expect(result.current.celebration.moment).toEqual({ kind: "badge", code: "countries_5" });
    expect(result.current.total).toBe(1);
  });

  it("drops an already queued celebration when its card is opened", async () => {
    fetchNotifications.mockResolvedValue({ notifications: [stamp("n1", "PT")] });
    const { result } = renderHook(() => useAchievementCelebrations("user-1", 1));
    await waitFor(() => expect(result.current.celebration).not.toBeNull());

    act(() => result.current.skip({ kind: "country", code: "PT" }));

    expect(result.current.celebration).toBeNull();
  });

  it("does not bring back a skipped celebration on the next visit", async () => {
    fetchNotifications.mockResolvedValue({ notifications: [stamp("n1", "PT")] });
    const first = renderHook(() => useAchievementCelebrations("user-1", 1));
    act(() => first.result.current.skip({ kind: "country", code: "PT" }));
    await waitFor(() => expect(fetchNotifications).toHaveBeenCalled());
    first.unmount();

    const { result } = renderHook(() => useAchievementCelebrations("user-1", 1));

    await waitFor(() => expect(fetchNotifications).toHaveBeenCalledTimes(2));
    expect(result.current.celebration).toBeNull();
  });

  it("does not ask for notifications while signed out or with nothing unread", () => {
    renderHook(() => useAchievementCelebrations(null, 3));
    renderHook(() => useAchievementCelebrations("user-1", 0));

    expect(fetchNotifications).not.toHaveBeenCalled();
  });

  it("forgets the pending celebrations on logout", async () => {
    fetchNotifications.mockResolvedValue({ notifications: [stamp("n1", "PT")] });
    const { result, rerender } = renderHook(({ userId }) => useAchievementCelebrations(userId, 1), { initialProps: { userId: "user-1" } });
    await waitFor(() => expect(result.current.celebration).not.toBeNull());

    rerender({ userId: null });

    expect(result.current.celebration).toBeNull();
  });

  it("shows nothing when the notifications fail to load", async () => {
    fetchNotifications.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useAchievementCelebrations("user-1", 1));

    await waitFor(() => expect(fetchNotifications).toHaveBeenCalled());
    expect(result.current.celebration).toBeNull();
  });
});
