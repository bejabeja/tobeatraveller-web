import { renderHook, waitFor } from "@testing-library/react";
import { useSyncUserLanguage } from "./useSyncUserLanguage";

let mockLanguage = "es";
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { resolvedLanguage: mockLanguage } }),
}));

jest.mock("../services/users", () => ({ updateMyLanguage: jest.fn() }));

import { updateMyLanguage } from "../services/users";

describe("useSyncUserLanguage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLanguage = "es";
    updateMyLanguage.mockResolvedValue();
  });

  it("saves the app's language for the signed-in user", async () => {
    renderHook(() => useSyncUserLanguage("user-1"));

    await waitFor(() => expect(updateMyLanguage).toHaveBeenCalledWith("es"));
  });

  it("saves it again when the user switches language", async () => {
    const { rerender } = renderHook(() => useSyncUserLanguage("user-1"));
    await waitFor(() => expect(updateMyLanguage).toHaveBeenCalledTimes(1));

    mockLanguage = "en";
    rerender();

    await waitFor(() => expect(updateMyLanguage).toHaveBeenLastCalledWith("en"));
  });

  it("does nothing while signed out", () => {
    renderHook(() => useSyncUserLanguage(null));

    expect(updateMyLanguage).not.toHaveBeenCalled();
  });

  // Offline, or an API from before the language was saved.
  it("does not break the app when saving fails", async () => {
    updateMyLanguage.mockRejectedValue(new Error("offline"));

    renderHook(() => useSyncUserLanguage("user-1"));

    await waitFor(() => expect(updateMyLanguage).toHaveBeenCalled());
  });
});
