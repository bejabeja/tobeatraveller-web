import { renderHook, waitFor } from "@testing-library/react";
import { useSyncPendingDeclaredCountries } from "./useSyncPendingDeclaredCountries";
import { getPendingDeclaredCountries, setPendingDeclaredCountries } from "../utils/pendingDeclaredCountries";

jest.mock("../services/passport", () => ({
  getUserPassport: jest.fn(),
  updateMyDeclaredCountries: jest.fn(),
}));

import { getUserPassport, updateMyDeclaredCountries } from "../services/passport";

describe("useSyncPendingDeclaredCountries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    getUserPassport.mockResolvedValue({ declaredCountries: [{ code: "PT" }] });
    updateMyDeclaredCountries.mockResolvedValue();
  });

  it("adds what the visitor marked to the countries already declared, then forgets it", async () => {
    setPendingDeclaredCountries(["JP", "PT"]);

    renderHook(() => useSyncPendingDeclaredCountries("user-1"));

    await waitFor(() => expect(updateMyDeclaredCountries).toHaveBeenCalledWith(["PT", "JP"]));
    await waitFor(() => expect(getPendingDeclaredCountries()).toEqual([]));
  });

  it("keeps the marks to retry later when saving fails", async () => {
    setPendingDeclaredCountries(["JP"]);
    updateMyDeclaredCountries.mockRejectedValue(new Error("offline"));

    renderHook(() => useSyncPendingDeclaredCountries("user-1"));

    await waitFor(() => expect(updateMyDeclaredCountries).toHaveBeenCalled());
    expect(getPendingDeclaredCountries()).toEqual(["JP"]);
  });

  it("does nothing while signed out or with nothing marked", () => {
    setPendingDeclaredCountries(["JP"]);
    renderHook(() => useSyncPendingDeclaredCountries(null));
    localStorage.clear();
    renderHook(() => useSyncPendingDeclaredCountries("user-1"));

    expect(getUserPassport).not.toHaveBeenCalled();
  });

  // The API would reject the whole list for it, on every login, forever.
  it("drops stored codes that aren't countries", async () => {
    localStorage.setItem("pending_declared_countries", JSON.stringify(["JP", "ZZ", 42]));

    renderHook(() => useSyncPendingDeclaredCountries("user-1"));

    await waitFor(() => expect(updateMyDeclaredCountries).toHaveBeenCalledWith(["PT", "JP"]));
  });

  it("ignores stored data that isn't a list of codes", () => {
    localStorage.setItem("pending_declared_countries", "{not json");

    expect(getPendingDeclaredCountries()).toEqual([]);
  });
});
