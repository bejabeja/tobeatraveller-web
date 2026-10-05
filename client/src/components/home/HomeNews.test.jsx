import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockDispatch = jest.fn();
let mockNotifications = [];

jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("../notifications/NotificationItem", () => ({ notification }) => <p>row {notification.id}</p>);
jest.mock("@tobeatraveller/shared", () => ({
  initNotifications: () => "init-notifications",
  selectNotifications: () => mockNotifications,
}));

import HomeNews from "./HomeNews";

const renderNews = () => render(<MemoryRouter><HomeNews /></MemoryRouter>);
const note = (id, isRead) => ({ id, isRead });

beforeEach(() => {
  jest.clearAllMocks();
  mockNotifications = [];
});

describe("HomeNews", () => {
  it("reads the notifications, without opening them (which would mark them as seen)", () => {
    renderNews();

    expect(mockDispatch).toHaveBeenCalledWith("init-notifications");
  });

  it("shows what they have not seen, with the way to all of it", () => {
    mockNotifications = [note("a", false), note("b", true)];

    renderNews();

    expect(screen.getByText("row a")).toBeInTheDocument();
    expect(screen.queryByText("row b")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "common.seeAll" })).toHaveAttribute("href", "/notifications");
  });

  it("shows no more than three, so it stays a glance", () => {
    mockNotifications = ["a", "b", "c", "d", "e"].map((id) => note(id, false));

    renderNews();

    expect(screen.getAllByText(/^row /)).toHaveLength(3);
  });

  // Regression-in-waiting: an empty "news" box says nothing and takes the space of what does.
  it("is left out when there is nothing new", () => {
    mockNotifications = [note("a", true)];

    const { container } = renderNews();

    expect(container).toBeEmptyDOMElement();
  });
});
