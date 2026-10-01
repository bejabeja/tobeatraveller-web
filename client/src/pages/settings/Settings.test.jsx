import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
  Trans: ({ i18nKey }) => i18nKey,
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../i18n", () => ({ __esModule: true, default: { resolvedLanguage: "en", changeLanguage: jest.fn() } }));
jest.mock("../../components/form/SelectMenu", () => () => null);
jest.mock("../../components/spinner/Spinner", () => () => null);
jest.mock("../../utils/analytics", () => ({ REOPEN_COOKIE_PREFERENCES_EVENT: "reopen-cookie-preferences" }));
jest.mock("../../services/users", () => ({ changePassword: jest.fn(), deleteMyAccount: jest.fn(), exportMyData: jest.fn() }));
jest.mock("../../store/auth/authActions", () => ({ logoutUser: jest.fn() }));
jest.mock("../../store/auth/authSelectors", () => ({ selectAuthUser: () => ({ id: "user-1", username: "jane" }) }));
jest.mock("../../store/user/userInfoActions", () => ({ setUserInfo: jest.fn() }));
jest.mock("../../store/user/userInfoSelectors", () => ({
  selectMe: () => ({ id: "user-1", username: "jane", email: "jane@example.com" }),
  selectMeLoading: () => false,
}));
jest.mock("@tobeatraveller/shared", () => ({
  ...jest.requireActual("@tobeatraveller/shared/src/utils/schemasValidation.js"),
  APP_LANGUAGES: [],
  fetchNotificationPreferences: jest.fn(),
  toAppLanguage: (language) => language,
  updateNotificationPreferences: jest.fn(),
}));

import toast from "react-hot-toast";
import { fetchNotificationPreferences } from "@tobeatraveller/shared";
import { changePassword } from "../../services/users";
import Settings from "./Settings";

const submitNewPassword = async (newPassword) => {
  render(<MemoryRouter><Settings /></MemoryRouter>);
  await userEvent.click(await screen.findByRole("button", { name: /editProfile.changePassword$/ }));
  await userEvent.type(screen.getByLabelText("editProfile.currentPasswordLabel"), "old-password");
  await userEvent.type(screen.getByLabelText("editProfile.newPasswordLabel"), newPassword);
  await userEvent.type(screen.getByLabelText("editProfile.confirmNewPasswordLabel"), newPassword);
  await userEvent.click(screen.getAllByRole("button", { name: "editProfile.changePassword" }).at(-1));
};

describe("Settings: changing the password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchNotificationPreferences.mockResolvedValue({
      pushEnabled: false, notifyOnComment: true, notifyOnLike: true, notifyOnFollow: true, notifyOnFriendStamps: false,
    });
    changePassword.mockResolvedValue({});
  });

  // Regression-in-waiting: it asked for 6 here while signing up and resetting ask for 8.
  it("asks for 8 characters, like signing up, and does not send a shorter one", async () => {
    await submitNewPassword("abcdefg");

    expect(await screen.findByText("errors.passwordMin")).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("does not take a password made of spaces", async () => {
    await submitNewPassword("        ");

    expect(await screen.findByText("errors.passwordMin")).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("changes it with 8 characters", async () => {
    await submitNewPassword("abcdefgh");

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith({ currentPassword: "old-password", newPassword: "abcdefgh" }));
    expect(toast.success).toHaveBeenCalledWith("editProfile.passwordChanged");
  });
});
