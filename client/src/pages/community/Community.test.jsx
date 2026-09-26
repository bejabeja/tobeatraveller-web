import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let mockState;

jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(mockState),
  useDispatch: () => jest.fn(),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("../../hooks/usePageMeta.js", () => ({ usePageMeta: jest.fn() }));
jest.mock("../../components/users/UsersSection.jsx", () => ({
  __esModule: true,
  default: ({ users }) => <ul>{users.map(user => <li key={user.id}>@{user.username}</li>)}</ul>,
}));

import Community from "./Community";

const buildState = ({ users = [{ id: "u2", username: "ana" }], totalPages = 1 } = {}) => ({
  auth: { isAuthenticated: true, user: { id: "u1" } },
  users: { all: { data: users, loading: false, loadingMore: false, error: null, currentPage: 1, totalPages } },
});

const renderCommunity = () => render(<MemoryRouter><Community /></MemoryRouter>);

describe("Community", () => {
  beforeEach(() => {
    mockState = buildState();
  });

  // With few people on the platform the list ends quickly: it ends on a way
  // to bring more in rather than on nothing.
  it("ends the whole list with an invitation to bring friends", () => {
    renderCommunity();

    expect(screen.getByRole("link", { name: "community.inviteButton" })).toHaveAttribute("href", "/invite");
    expect(screen.queryByRole("button", { name: "common.loadMore" })).not.toBeInTheDocument();
  });

  it("offers more people instead of the invitation while there are more pages", () => {
    mockState = buildState({ totalPages: 3 });
    renderCommunity();

    expect(screen.getByRole("button", { name: "common.loadMore" })).toBeInTheDocument();
    expect(screen.queryByText("community.inviteTitle")).not.toBeInTheDocument();
  });

  // Regression: finding nobody showed four messages and a second way to
  // clear the search, with inviting them as a small link at the end.
  it("says once who was not found and offers to invite them", () => {
    mockState = buildState({ users: [] });
    renderCommunity();

    fireEvent.change(screen.getByRole("searchbox", { name: "community.search" }), { target: { value: "marta" } });

    expect(screen.getByText("community.noTravelersFor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "community.inviteButton" })).toHaveAttribute("href", "/invite");
    expect(screen.getAllByRole("button")).toEqual([screen.getByRole("button", { name: "explore.clearSearch" })]);
  });

  it("reminds, under a search's results, that the person may not be here yet", () => {
    renderCommunity();

    fireEvent.change(screen.getByRole("searchbox", { name: "community.search" }), { target: { value: "an" } });

    expect(screen.getByText(/community.searchInvite/)).toBeInTheDocument();
    expect(screen.queryByText("community.inviteTitle")).not.toBeInTheDocument();
  });
});
