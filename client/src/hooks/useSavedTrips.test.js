import { renderHook, waitFor } from "@testing-library/react";
import { useSavedTrips } from "./useSavedTrips";

jest.mock("../services/favorites", () => ({ getUserFavorites: jest.fn() }));

import { getUserFavorites } from "../services/favorites";

describe("useSavedTrips", () => {
  beforeEach(() => jest.clearAllMocks());

  it("loads the signed-in user's saved trips", async () => {
    getUserFavorites.mockResolvedValue([{ id: "trip-1" }]);

    const { result } = renderHook(() => useSavedTrips(true));

    await waitFor(() => expect(result.current).toEqual({ trips: [{ id: "trip-1" }], loading: false, error: false }));
  });

  // Saved trips are private: never asked for on someone else's profile.
  it("asks for nothing when not enabled", () => {
    const { result } = renderHook(() => useSavedTrips(false));

    expect(getUserFavorites).not.toHaveBeenCalled();
    expect(result.current.trips).toEqual([]);
  });

  it("reports the error when they cannot be loaded", async () => {
    getUserFavorites.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useSavedTrips(true));

    await waitFor(() => expect(result.current).toEqual({ trips: [], loading: false, error: true }));
  });
});
