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
  APP_LANGUAGES: [],
  fetchNotificationPreferences: jest.fn(),
  toAppLanguage: (language) => language,
  updateNotificationPreferences: jest.fn(),
}));

import toast from "react-hot-toast";
import { fetchNotificationPreferences, updateMyTravelStyle } from "@tobeatraveller/shared";
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

  it("says it could not be saved, and does not refresh the profile as if it had been", async () => {
    updateMyTravelStyle.mockRejectedValue(new Error("Network error"));
    renderSettings();

    fireEvent.change(await screen.findByLabelText("settings.travelStyle"), { target: { value: "van" } });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("errors.somethingWrong"));
    expect(mockDispatch).not.toHaveBeenCalledWith({ type: "setUserInfo", id: "user-1" });
  });
});
