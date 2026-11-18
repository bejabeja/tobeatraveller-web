import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { chooseOption } from "../../testUtils/chooseOption";

jest.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, vars) => (vars ? `${key}:${Object.values(vars).join("/")}` : key),
    i18n: { language: "es" },
  }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@tobeatraveller/shared", () => {
  const { z } = require("zod");
  return {
    formatDate: (date) => new Date(date).toISOString().slice(0, 10),
    isIndefinitePremium: (date) => new Date(date).getFullYear() > 2100,
    ADMIN_NOTICE_MAX_LENGTH: 500,
    adminNoticeSchema: z.object({ message: z.string().min(3) }),
    ...jest.requireActual("../../../../shared/src/utils/roles.js"),
    userFacingError: (t, error, fallback) => fallback,
  };
});
jest.mock("../../hooks/useDebounced", () => (effect, deps) => require("react").useEffect(effect, deps));
jest.mock("../../services/users", () => ({
  getAllUsersForAdmin: jest.fn(),
  updateUserTier: jest.fn(),
  updateUserRole: jest.fn(),
  deleteUserById: jest.fn(),
  sendAdminNotice: jest.fn(),
}));
jest.mock("./UserDetailModal", () => ({ user, onClose }) => (
  user ? <div data-testid="user-detail-modal">{user.username}<button onClick={onClose}>close</button></div> : null
));
let mockActingRole = "admin";
jest.mock("../../store/auth/authSelectors", () => ({ selectAuthUser: () => ({ id: "admin-1", role: mockActingRole }) }));
jest.mock("../../store/user/userInfoSelectors", () => ({ selectMe: () => null }));
jest.mock("../../utils/constants/constants", () => ({ generateAvatar: () => "avatar.svg" }));

import toast from "react-hot-toast";
import { getAllUsersForAdmin, sendAdminNotice, updateUserTier } from "../../services/users";
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

  chooseOption(tierSelect, "gift:3");

  expect(updateUserTier).toHaveBeenCalledWith("u2", "premium", 3);
  await waitFor(() => expect(tierSelect).toHaveTextContent("admin.premiumUntil:2026-12-27"));
});

it("gifts premium with no end date", async () => {
  updateUserTier.mockResolvedValue({ id: "u2", isPremium: true, premiumUntil: "2126-09-27T10:00:00.000Z" });
  const tierSelect = await renderWith(user());

  chooseOption(tierSelect, "gift:");

  expect(updateUserTier).toHaveBeenCalledWith("u2", "premium", undefined);
  await waitFor(() => expect(tierSelect).toHaveTextContent("admin.premiumIndefinite"));
});

it("says when someone stays premium after a removal because they pay for it", async () => {
  updateUserTier.mockResolvedValue({ id: "u2", isPremium: true, premiumUntil: PAID_UNTIL });
  const tierSelect = await renderWith(user({ isPremium: true, premiumUntil: "2126-01-01T00:00:00.000Z" }));

  chooseOption(tierSelect, "free");

  expect(updateUserTier).toHaveBeenCalledWith("u2", "free", undefined);
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("admin.tierKeptPaid:2026-12-01"));
});

it("only offers to remove premium from someone who has it", async () => {
  const tierSelect = await renderWith(user());

  expect(tierSelect.querySelector('option[value="free"]')).toBeNull();
});

it("reloads with the chosen role and premium filters", async () => {
  await renderWith(user());
  getAllUsersForAdmin.mockClear();

  chooseOption(screen.getByRole("combobox", { name: "admin.allRoles" }), "admin");
  chooseOption(screen.getByRole("combobox", { name: "admin.allTiers" }), "premium");

  await waitFor(() => expect(getAllUsersForAdmin).toHaveBeenLastCalledWith(
    expect.objectContaining({ role: "admin", isPremium: true })
  ));
});

it("opens the detail modal for the clicked user", async () => {
  await renderWith(user());

  fireEvent.click(screen.getByRole("button", { name: "admin.userDetailTitle:jane" }));

  expect(screen.getByTestId("user-detail-modal")).toHaveTextContent("jane");
});

it("sends an admin notice with the typed message", async () => {
  sendAdminNotice.mockResolvedValue(undefined);
  await renderWith(user());

  fireEvent.click(screen.getByRole("button", { name: "admin.sendNotice" }));
  const textarea = await screen.findByPlaceholderText("admin.sendNoticePlaceholder");
  fireEvent.change(textarea, { target: { value: "Please review your last trip" } });
  const [, confirmButton] = screen.getAllByRole("button", { name: "admin.sendNotice" });
  fireEvent.click(confirmButton);

  await waitFor(() => expect(sendAdminNotice).toHaveBeenCalledWith("u2", "Please review your last trip"));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("admin.noticeSent"));
});

it("disables sending a notice to yourself", async () => {
  await renderWith(user({ id: "admin-1" }));

  expect(screen.getByRole("button", { name: "admin.sendNotice" })).toBeDisabled();
});

// Regression: an admin was offered to change or delete another admin, or to make someone a
// superadmin, and the API turned it down with an error.
const roleOption = (role) => document.querySelector(`[role="option"][data-value="${role}"]`);

describe("what an admin is offered for each account", () => {
  afterEach(() => { mockActingRole = "admin"; });

  it("does not let an admin change or delete an account of the team", async () => {
    await renderWith(user({ role: "admin" }));

    expect(screen.getByRole("combobox", { name: "jane" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "common.delete" })).toBeDisabled();
  });

  it("lets an admin change and delete a traveller's account, but not make them a superadmin", async () => {
    await renderWith(user({ role: "user" }));

    const roleSelect = screen.getByRole("combobox", { name: "jane" });
    expect(roleSelect).toBeEnabled();
    expect(screen.getByRole("button", { name: "common.delete" })).toBeEnabled();
    fireEvent.click(roleSelect);
    expect(roleOption("superadmin")).toBeNull();
    expect(roleOption("admin")).not.toBeNull();
  });

  it("lets a superadmin change and delete an account of the team, and make a superadmin", async () => {
    mockActingRole = "superadmin";
    await renderWith(user({ role: "admin" }));

    const roleSelect = screen.getByRole("combobox", { name: "jane" });
    expect(roleSelect).toBeEnabled();
    expect(screen.getByRole("button", { name: "common.delete" })).toBeEnabled();
    fireEvent.click(roleSelect);
    expect(roleOption("superadmin")).not.toBeNull();
  });

  it("does not let anyone change or delete their own account here", async () => {
    mockActingRole = "superadmin";
    await renderWith(user({ id: "admin-1", role: "superadmin" }));

    expect(screen.getByRole("combobox", { name: "jane" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "common.delete" })).toBeDisabled();
  });
});
