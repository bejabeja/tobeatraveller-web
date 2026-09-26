import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

let mockMe;

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: () => mockMe,
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars?.date ? `${key}:${vars.date}` : key), i18n: { language: "en" } }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../hooks/useAvatarUpload", () => ({ useAvatarUpload: () => ({}) }));
jest.mock("../../hooks/useGeocodeSearch", () => ({ useGeocodeSearch: () => ({ reverseGeocode: jest.fn() }) }));
jest.mock("../../hooks/useCurrentLocation", () => ({ useCurrentLocation: () => ({ getCurrentLocation: jest.fn(), loading: false }) }));
jest.mock("../../store/auth/authActions", () => ({ initAuthUser: jest.fn() }));
jest.mock("../../store/user/userInfoActions", () => ({ setUserInfo: jest.fn() }));
jest.mock("../../services/users", () => ({ checkUsernameAvailable: jest.fn().mockResolvedValue(true), updateUser: jest.fn() }));

import EditProfile from "./EditProfile";

const ME = { id: "user-1", username: "jane", name: "", bio: "", location: "", about: "", usernameChangeAvailableAt: null };

const renderEditProfile = () => render(
  <MemoryRouter initialEntries={["/profile/edit/user-1"]}>
    <Routes><Route path="/profile/edit/:id" element={<EditProfile />} /></Routes>
  </MemoryRouter>
);

describe("EditProfile username changes", () => {
  it("locks the username until 30 days after the last change, saying until when", () => {
    mockMe = { ...ME, usernameChangeAvailableAt: "2026-10-26T12:00:00Z" };

    renderEditProfile();

    expect(screen.getByLabelText("editProfile.usernameLabel")).toBeDisabled();
    expect(screen.getByText(/editProfile.usernameLockedUntil:October 26, 2026/)).toBeInTheDocument();
  });

  it("warns, before saving, that a new name can't be changed again for 30 days", () => {
    mockMe = ME;
    renderEditProfile();
    expect(screen.queryByText("editProfile.usernameChangeLimit")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("editProfile.usernameLabel"), { target: { value: "jane_vanlife" } });

    expect(screen.getByText("editProfile.usernameChangeLimit")).toBeInTheDocument();
  });

  it("doesn't warn for a change of capitals only", () => {
    mockMe = ME;
    renderEditProfile();

    fireEvent.change(screen.getByLabelText("editProfile.usernameLabel"), { target: { value: "Jane" } });

    expect(screen.queryByText("editProfile.usernameChangeLimit")).not.toBeInTheDocument();
  });

  // Regression: the button to upload a photo read "Basic info".
  it("offers to upload a photo when there is none", () => {
    mockMe = ME;

    renderEditProfile();

    expect(screen.getByRole("button", { name: "editProfile.addPhoto" })).toBeInTheDocument();
  });
});
