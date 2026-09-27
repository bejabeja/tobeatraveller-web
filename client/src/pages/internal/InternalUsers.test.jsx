import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, vars) => (vars ? `${key}:${Object.values(vars).join("/")}` : key),
    i18n: { language: "es" },
  }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@tobeatraveller/shared", () => ({ formatDate: (date) => new Date(date).toISOString().slice(0, 10) }));
jest.mock("../../hooks/useDebounced", () => (effect, deps) => require("react").useEffect(effect, deps));
jest.mock("../../services/users", () => ({
  getAllUsersForAdmin: jest.fn(),
  updateUserTier: jest.fn(),
  updateUserRole: jest.fn(),
  deleteUserById: jest.fn(),
}));
jest.mock("../../store/auth/authSelectors", () => ({ selectAuthUser: () => ({ id: "admin-1" }) }));
jest.mock("../../store/user/userInfoSelectors", () => ({ selectMe: () => null }));
jest.mock("../../utils/constants/constants", () => ({ generateAvatar: () => "avatar.svg" }));

import toast from "react-hot-toast";
import { getAllUsersForAdmin, updateUserTier } from "../../services/users";
import InternalUsers from "./InternalUsers";

const PAID_UNTIL = "2026-12-01T00:00:00.000Z";
const user = (overrides) => ({
  id: "u2", username: "jane", email: "jane@example.com", role: "user",
  isPremium: false, premiumUntil: null, createdAt: "2026-01-01", totalItineraries: 2, ...overrides,
});

const renderWith = async (listedUser) => {
  getAllUsersForAdmin.mockResolvedValue({ users: [listedUser], currentPage: 1, totalPages: 1 });
  render(<InternalUsers />);
  return screen.findByRole("combobox", { name: "admin.premium" });
};

it("gifts premium for the months chosen and shows until when", async () => {
  updateUserTier.mockResolvedValue({ id: "u2", isPremium: true, premiumUntil: "2026-12-27T10:00:00.000Z" });
  const tierSelect = await renderWith(user());

  fireEvent.change(tierSelect, { target: { value: "gift:3" } });

  expect(updateUserTier).toHaveBeenCalledWith("u2", "premium", 3);
  await waitFor(() => expect(tierSelect).toHaveTextContent("admin.premiumUntil:2026-12-27"));
});

it("gifts premium with no end date", async () => {
  updateUserTier.mockResolvedValue({ id: "u2", isPremium: true, premiumUntil: "2126-09-27T10:00:00.000Z" });
  const tierSelect = await renderWith(user());

  fireEvent.change(tierSelect, { target: { value: "gift:" } });

  expect(updateUserTier).toHaveBeenCalledWith("u2", "premium", undefined);
  await waitFor(() => expect(tierSelect).toHaveTextContent("admin.premiumIndefinite"));
});

it("says when someone stays premium after a removal because they pay for it", async () => {
  updateUserTier.mockResolvedValue({ id: "u2", isPremium: true, premiumUntil: PAID_UNTIL });
  const tierSelect = await renderWith(user({ isPremium: true, premiumUntil: "2126-01-01T00:00:00.000Z" }));

  fireEvent.change(tierSelect, { target: { value: "free" } });

  expect(updateUserTier).toHaveBeenCalledWith("u2", "free", undefined);
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("admin.tierKeptPaid:2026-12-01"));
});

it("only offers to remove premium from someone who has it", async () => {
  const tierSelect = await renderWith(user());

  expect(tierSelect.querySelector('option[value="free"]')).toBeNull();
});
