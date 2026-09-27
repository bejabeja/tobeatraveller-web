import { act, renderHook } from "@testing-library/react";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { error: jest.fn() } }));

import toast from "react-hot-toast";
import { useAvatarUpload } from "./useAvatarUpload";

// Regression: the warning was in English whatever the app's language.
it("warns in the app's language about a photo over 5 MB, and keeps the current one", () => {
  const { result } = renderHook(() => useAvatarUpload());

  act(() => result.current.handleAvatarChange({ size: 6 * 1024 * 1024 }));

  expect(toast.error).toHaveBeenCalledWith("validation.imageTooLarge");
  expect(result.current.avatarFile).toBeNull();
});
