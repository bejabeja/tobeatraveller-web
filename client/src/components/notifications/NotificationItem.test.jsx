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
  it("announces a new country by its flag and name, and opens its card ready to share", () => {
    renderItem(notification({ type: "country_stamp", countryCode: "IT" }));

    expect(screen.getByText("🇮🇹 Italia")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/profile/user-1/passport?share=moment&country=IT");
  });

  // Regression: the API wrote "19 hours ago" in English for everyone.
  it("says how long ago it was in the app's language, from the moment the API sends", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    renderItem(notification({ type: "follow", lastActivityAt: threeHoursAgo, postedAgo: "3 hours ago" }));

    expect(screen.getByText("time.hoursAgo")).toBeInTheDocument();
    expect(screen.queryByText("3 hours ago")).not.toBeInTheDocument();
  });

  // Regression: the prefix ran into the name ("You and@jane").
  it("keeps a space between the start of the referral reward and the friend's name", () => {
    const { container } = renderItem(notification({ type: "referral_reward" }));

    expect(container.textContent).toContain("notifications.referralRewardPrefix @jane notifications.referralRewardSuffix");
  });

  it("opens the card of the new badge ready to share", () => {
    renderItem(notification({ type: "badge_earned", badgeId: "explorer" }));

    expect(screen.getByText("badges.explorer.name")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/profile/user-1/passport?share=moment&badge=explorer");
  });

  // A friend's new country or stamp: their passport, where the countries in
  // common and the ranking are, not the sharing card (that's for the owner).
  it("tells about a friend's new country and opens their passport", () => {
    renderItem(notification({ type: "friend_stamp", countryCode: "PT", actor: { id: "ana-1", username: "ana" } }));

    expect(screen.getByText("@ana")).toBeInTheDocument();
    expect(screen.getByText("notifications.friendAddedCountry", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("🇵🇹 Portugal")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/profile/ana-1/passport");
  });

  it("tells about a friend's new badge by its emoji and name", () => {
    renderItem(notification({ type: "friend_stamp", badgeId: "explorer", actor: { id: "ana-1", username: "ana" } }));

    expect(screen.getByText("🧭 badges.explorer.name")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/profile/ana-1/passport");
  });

  it("groups several friends who added the same country", () => {
    renderItem(notification({ type: "friend_stamp", countryCode: "PT", count: 3 }));

    expect(screen.getByText("notifications.friendAddedCountryPlural", { exact: false })).toBeInTheDocument();
  });

  it("opens the yearly recap", () => {
    renderItem(notification({ type: "recap_ready" }));

    expect(screen.getByRole("link")).toHaveAttribute("href", "/recap?from=notification");
  });
});
