import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockDispatch = jest.fn();

jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("@tobeatraveller/shared", () => ({
  openNotifications: jest.fn(() => "open-notifications"),
  selectNotifications: () => [],
  selectNotificationsError: () => null,
  selectNotificationsLoading: () => false,
}));

import NotificationsPanel from "./NotificationsPanel";

const renderPanel = (isOpen) => render(<MemoryRouter><NotificationsPanel isOpen={isOpen} onClose={jest.fn()} /></MemoryRouter>);

describe("NotificationsPanel", () => {
  beforeEach(() => mockDispatch.mockClear());

  // Regression: marking as read could finish before the list loaded, and
  // then none showed as new.
  it("loads the list and then marks it as seen, when opened", () => {
    renderPanel(true);

    expect(mockDispatch).toHaveBeenCalledWith("open-notifications");
  });

  it("does nothing while closed", () => {
    renderPanel(false);

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
