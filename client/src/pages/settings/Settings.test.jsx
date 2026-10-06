import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

let mockMe = { id: "user-1", username: "jane", email: "jane@example.com" };
const mockDispatch = jest.fn();

jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => mockDispatch,
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
  Trans: ({ i18nKey }) => i18nKey,
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../i18n", () => ({ __esModule: true, default: { resolvedLanguage: "en", changeLanguage: jest.fn() } }));
// A plain select with the same options, so the tests can pick one.
jest.mock("../../components/form/SelectMenu", () => {
  const React = require("react");
  return ({ options, value, onChange, ariaLabel, placeholder }) => React.createElement(
    "select",
    { "aria-label": ariaLabel, value, onChange: (event) => onChange(event.target.value) },
    value === "" ? React.createElement("option", { value: "" }, placeholder) : null,
    ...options.map((option) => React.createElement("option", { key: option.value, value: option.value }, option.label)),
  );
});
jest.mock("../../components/spinner/Spinner", () => () => null);
jest.mock("../../utils/analytics", () => ({ REOPEN_COOKIE_PREFERENCES_EVENT: "reopen-cookie-preferences" }));
jest.mock("../../services/users", () => ({ changePassword: jest.fn(), deleteMyAccount: jest.fn(), exportMyData: jest.fn() }));
jest.mock("../../store/auth/authActions", () => ({ logoutUser: jest.fn() }));
jest.mock("../../store/auth/authSelectors", () => ({ selectAuthUser: () => ({ id: "user-1", username: "jane" }) }));
jest.mock("../../store/user/userInfoActions", () => ({ setUserInfo: (id) => ({ type: "setUserInfo", id }) }));
jest.mock("../../store/user/userInfoSelectors", () => ({
  selectMe: () => mockMe,
  selectMeLoading: () => false,
}));
jest.mock("@tobeatraveller/shared", () => ({
  ...jest.requireActual("@tobeatraveller/shared/src/utils/schemasValidation.js"),
  ...jest.requireActual("@tobeatraveller/shared/src/utils/travelStyle.js"),
  updateMyTravelStyle: jest.fn(),
  changeUnverifiedEmail: jest.fn(),
  APP_LANGUAGES: [],
  fetchNotificationPreferences: jest.fn(),
  toAppLanguage: (language) => language,
  updateNotificationPreferences: jest.fn(),
}));

import toast from "react-hot-toast";
import { changeUnverifiedEmail, fetchNotificationPreferences, updateMyTravelStyle } from "@tobeatraveller/shared";
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

  // Regression-in-waiting: it was a loose group of inputs, so Enter did nothing and the browser could not offer its saved password.
  it("sends the change with Enter, and marks the fields for the password manager", async () => {
    await submitNewPassword("abcdefgh");
    await waitFor(() => expect(changePassword).toHaveBeenCalledTimes(1));
    changePassword.mockClear();
    await userEvent.click(screen.getAllByRole("button", { name: /editProfile.changePassword$/ })[0]);

    expect(screen.getByLabelText("editProfile.currentPasswordLabel")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText("editProfile.newPasswordLabel")).toHaveAttribute("autocomplete", "new-password");
    await userEvent.type(screen.getByLabelText("editProfile.currentPasswordLabel"), "old-password");
    await userEvent.type(screen.getByLabelText("editProfile.newPasswordLabel"), "abcdefgh");
    await userEvent.type(screen.getByLabelText("editProfile.confirmNewPasswordLabel"), "abcdefgh{Enter}");

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith({ currentPassword: "old-password", newPassword: "abcdefgh" }));
  });

  it("changes it with 8 characters", async () => {
    await submitNewPassword("abcdefgh");

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith({ currentPassword: "old-password", newPassword: "abcdefgh" }));
    expect(toast.success).toHaveBeenCalledWith("editProfile.passwordChanged");
  });
});

describe("Settings: how you travel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMe = { id: "user-1", username: "jane", email: "jane@example.com" };
    fetchNotificationPreferences.mockResolvedValue({
      pushEnabled: false, notifyOnComment: true, notifyOnLike: true, notifyOnFollow: true, notifyOnFriendStamps: false,
    });
    updateMyTravelStyle.mockResolvedValue(undefined);
  });

  const renderSettings = () => render(<MemoryRouter><Settings /></MemoryRouter>);

  it("shows what they said, with both answers to choose from", async () => {
    mockMe = { ...mockMe, travelStyle: "van" };
    renderSettings();

    const select = await screen.findByLabelText("settings.travelStyle");

    expect(select).toHaveValue("van");
    expect(screen.getByRole("option", { name: "travelStyle.van" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "travelStyle.occasional" })).toBeInTheDocument();
  });

  it("says it is not set for someone who skipped the question, instead of choosing for them", async () => {
    mockMe = { ...mockMe, travelStyle: null };
    renderSettings();

    const select = await screen.findByLabelText("settings.travelStyle");

    expect(select).toHaveValue("");
    expect(screen.getByRole("option", { name: "settings.travelStyleNotSet" })).toBeInTheDocument();
  });

  // Regression-in-waiting: the basic profile does not carry the answer, so "not set" was shown to someone who did choose.
  it("does not show the row until the whole profile has arrived", async () => {
    mockMe = null;
    renderSettings();

    expect(await screen.findByText("settings.language")).toBeInTheDocument();
    expect(screen.queryByLabelText("settings.travelStyle")).not.toBeInTheDocument();
    expect(screen.queryByText("settings.travelStyleNotSet")).not.toBeInTheDocument();
  });

  it("saves the new answer and refreshes the profile", async () => {
    renderSettings();

    fireEvent.change(await screen.findByLabelText("settings.travelStyle"), { target: { value: "occasional" } });

    await waitFor(() => expect(updateMyTravelStyle).toHaveBeenCalledWith("occasional"));
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: "setUserInfo", id: "user-1" }));
  });

  it("confirms it was saved, since the row itself does not change until the profile comes back", async () => {
    renderSettings();

    fireEvent.change(await screen.findByLabelText("settings.travelStyle"), { target: { value: "occasional" } });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("settings.travelStyleSaved"));
  });

  it("says it could not be saved, and does not refresh the profile as if it had been", async () => {
    updateMyTravelStyle.mockRejectedValue(new Error("Network error"));
    renderSettings();

    fireEvent.change(await screen.findByLabelText("settings.travelStyle"), { target: { value: "van" } });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("errors.somethingWrong"));
    expect(mockDispatch).not.toHaveBeenCalledWith({ type: "setUserInfo", id: "user-1" });
  });
});

describe("Settings: notification preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMe = { id: "user-1", username: "jane", email: "jane@example.com" };
  });

  // Regression-in-waiting: a failed load left a heading with nothing under it and a toast that was gone in seconds.
  it("says they could not be loaded and lets them try again", async () => {
    fetchNotificationPreferences.mockRejectedValueOnce(new Error("Network error"));
    fetchNotificationPreferences.mockResolvedValueOnce({
      pushEnabled: false, notifyOnComment: true, notifyOnLike: true, notifyOnFollow: true, notifyOnFriendStamps: false, notifyOnTripReminders: true,
    });
    render(<MemoryRouter><Settings /></MemoryRouter>);

    expect(await screen.findByText("errors.notificationPreferencesLoadFailed")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "common.retry" }));

    expect(await screen.findByText("settings.notifyOnComment")).toBeInTheDocument();
    expect(screen.queryByText("errors.notificationPreferencesLoadFailed")).not.toBeInTheDocument();
  });
});

describe("Settings: correcting an email that was never confirmed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchNotificationPreferences.mockResolvedValue({ pushEnabled: false, notifyOnComment: true });
    changeUnverifiedEmail.mockResolvedValue({});
    mockMe = { id: "user-1", username: "jane", email: "jane@exmaple.com", emailVerified: false };
  });

  afterEach(() => {
    mockMe = { id: "user-1", username: "jane", email: "jane@example.com" };
  });

  it("offers it only to whoever has not confirmed", async () => {
    mockMe = { ...mockMe, emailVerified: true };
    render(<MemoryRouter><Settings /></MemoryRouter>);

    await screen.findByText("settings.account");
    expect(screen.queryByRole("button", { name: /emailVerification.changeLink/ })).not.toBeInTheDocument();
  });

  it("sends the corrected address with the password and refreshes the profile", async () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);

    await userEvent.click(await screen.findByRole("button", { name: /emailVerification.changeLink/ }));
    await userEvent.type(screen.getByLabelText("emailVerification.newEmailLabel"), " jane@example.com ");
    await userEvent.type(screen.getByLabelText("emailVerification.passwordLabel"), "secret-pass{Enter}");

    await waitFor(() => expect(changeUnverifiedEmail).toHaveBeenCalledWith({ email: "jane@example.com", currentPassword: "secret-pass" }));
    expect(mockDispatch).toHaveBeenCalledWith({ type: "setUserInfo", id: "user-1" });
    expect(toast.success).toHaveBeenCalled();
  });

  it("says why it failed and keeps the form open", async () => {
    changeUnverifiedEmail.mockRejectedValue(new Error("auth.emailInUse"));
    render(<MemoryRouter><Settings /></MemoryRouter>);

    await userEvent.click(await screen.findByRole("button", { name: /emailVerification.changeLink/ }));
    await userEvent.type(screen.getByLabelText("emailVerification.newEmailLabel"), "taken@example.com");
    await userEvent.type(screen.getByLabelText("emailVerification.passwordLabel"), "secret-pass{Enter}");

    expect(await screen.findByText("auth.emailInUse")).toBeInTheDocument();
    expect(screen.getByLabelText("emailVerification.newEmailLabel")).toBeInTheDocument();
  });
});

describe("Settings: where the plan and the invitations are", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchNotificationPreferences.mockResolvedValue({ pushEnabled: false, notifyOnComment: true });
  });

  it("leads to the subscription and to inviting friends", async () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);

    expect(await screen.findByRole("link", { name: /settings.plan$/ })).toHaveAttribute("href", "/subscription");
    expect(screen.getByRole("link", { name: /settings.inviteFriends$/ })).toHaveAttribute("href", "/invite");
  });
});
