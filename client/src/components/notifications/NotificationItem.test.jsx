import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotificationItem from "./NotificationItem.jsx";

const mockT = (key) => key;
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT, i18n: { language: "es" } }),
}));

const notification = (overrides) => ({
  id: "n1", isRead: false, count: 1, postedAgo: "1m", actor: { id: "user-1", username: "jane", avatarUrl: null },
  ...overrides,
});

const renderItem = (n) => render(<MemoryRouter><NotificationItem notification={n} onClick={jest.fn()} /></MemoryRouter>);

describe("NotificationItem", () => {
  it("announces a new country by its flag and name, and opens the passport ready to share it", () => {
    renderItem(notification({ type: "country_stamp", countryCode: "IT" }));

    expect(screen.getByText("🇮🇹 Italia")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/profile/user-1/passport?share=countries");
  });

  it("opens the passport ready to share the new badge", () => {
    renderItem(notification({ type: "badge_earned", badgeId: "explorer" }));

    expect(screen.getByText("badges.explorer.name")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/profile/user-1/passport?share=achievements");
  });
});
