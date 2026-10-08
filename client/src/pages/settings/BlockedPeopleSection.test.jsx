import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join("/")}` : key) }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../services/blocks", () => ({ getBlockedUsers: jest.fn(), unblockUser: jest.fn() }));

import toast from "react-hot-toast";
import { getBlockedUsers, unblockUser } from "../../services/blocks";
import BlockedPeopleSection from "./BlockedPeopleSection";

const renderSection = () => render(<MemoryRouter><BlockedPeopleSection /></MemoryRouter>);

beforeEach(() => jest.clearAllMocks());

it("says so when the person has not blocked anyone", async () => {
  getBlockedUsers.mockResolvedValue([]);

  renderSection();

  expect(await screen.findByText("settings.blockedPeopleEmpty")).toBeInTheDocument();
});

it("lists the people blocked, each with a way to unblock them", async () => {
  getBlockedUsers.mockResolvedValue([{ id: "u1", username: "otherwalker", avatarUrl: null }]);

  renderSection();

  expect(await screen.findByText("@otherwalker")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "block.unblockButton" })).toBeInTheDocument();
});

it("removes a person from the list once unblocked", async () => {
  getBlockedUsers.mockResolvedValue([{ id: "u1", username: "otherwalker", avatarUrl: null }]);
  unblockUser.mockResolvedValue(null);
  renderSection();

  fireEvent.click(await screen.findByRole("button", { name: "block.unblockButton" }));

  await waitFor(() => expect(screen.queryByText("@otherwalker")).not.toBeInTheDocument());
  expect(unblockUser).toHaveBeenCalledWith("u1");
  expect(toast.success).toHaveBeenCalledWith("block.unblocked:otherwalker");
});

it("keeps the person in the list and tells why when the unblock fails", async () => {
  getBlockedUsers.mockResolvedValue([{ id: "u1", username: "otherwalker", avatarUrl: null }]);
  unblockUser.mockRejectedValue(new Error("boom"));
  renderSection();

  fireEvent.click(await screen.findByRole("button", { name: "block.unblockButton" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("block.error"));
  expect(screen.getByText("@otherwalker")).toBeInTheDocument();
});

it("shows an error when the list cannot be loaded", async () => {
  getBlockedUsers.mockRejectedValue(new Error("down"));

  renderSection();

  expect(await screen.findByRole("alert")).toHaveTextContent("block.listError");
});
