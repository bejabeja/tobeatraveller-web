import { render, screen, within } from "@testing-library/react";

let mockNotifications;

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) => selector(),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("@tobeatraveller/shared", () => ({
  loadMoreNotifications: jest.fn(),
  openNotifications: jest.fn(),
  selectNotifications: () => mockNotifications,
  selectNotificationsError: () => null,
  selectNotificationsLoading: () => false,
  selectNotificationsLoadingMore: () => false,
  selectNotificationsPage: () => 1,
  selectNotificationsTotalPages: () => 1,
}));
jest.mock("../../components/notifications/NotificationItem", () => ({
  __esModule: true,
  default: ({ notification }) => <p>notification:{notification.id}</p>,
}));

import Notifications from "./Notifications";

describe("Notifications", () => {
  // Regression: opening the page marked them all as read on screen at once,
  // so the new ones could never be told apart.
  it("shows the new ones apart from the earlier ones", () => {
    mockNotifications = [{ id: "n1", isRead: false }, { id: "n2", isRead: true }];

    render(<Notifications />);

    const fresh = screen.getByRole("region", { name: "notifications.new" });
    const earlier = screen.getByRole("region", { name: "notifications.earlier" });
    expect(within(fresh).getByText("notification:n1")).toBeInTheDocument();
    expect(within(earlier).getByText("notification:n2")).toBeInTheDocument();
  });

  it("gives no headings when nothing is new", () => {
    mockNotifications = [{ id: "n2", isRead: true }];

    render(<Notifications />);

    expect(screen.getByText("notification:n2")).toBeInTheDocument();
    expect(screen.queryByText("notifications.new")).not.toBeInTheDocument();
    expect(screen.queryByText("notifications.earlier")).not.toBeInTheDocument();
  });
});
