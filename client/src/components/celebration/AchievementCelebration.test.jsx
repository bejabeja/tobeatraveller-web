import { fireEvent, render, screen } from "@testing-library/react";
import AchievementCelebration from "./AchievementCelebration.jsx";

const mockT = (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key);
const mockNavigate = jest.fn();
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT, i18n: { language: "es" } }) }));
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));

import { trackEvent } from "../../utils/analytics";

const COUNTRY = { notificationId: "n1", moment: { kind: "country", code: "IT" } };
const BADGE = { notificationId: "n2", moment: { kind: "badge", code: "explorer" } };

const renderCelebration = (props = {}) => {
  const handlers = { onDismiss: jest.fn(), onShare: jest.fn() };
  render(<AchievementCelebration celebration={COUNTRY} userId="u1" position={1} total={1} {...handlers} {...props} />);
  return handlers;
};

describe("AchievementCelebration", () => {
  beforeEach(() => jest.clearAllMocks());

  it("stamps the new country's flag and name on screen", () => {
    renderCelebration();

    expect(screen.getByRole("dialog", { name: "passport.celebrationCountryTitle" })).toBeInTheDocument();
    expect(screen.getByText("🇮🇹")).toBeInTheDocument();
    expect(screen.getByText("Italia")).toBeInTheDocument();
  });

  it("stamps a new badge's emoji and name", () => {
    renderCelebration({ celebration: BADGE });

    expect(screen.getByRole("dialog", { name: "passport.celebrationBadgeTitle" })).toBeInTheDocument();
    expect(screen.getByText("🧭")).toBeInTheDocument();
    expect(screen.getByText("badges.explorer.name")).toBeInTheDocument();
  });

  it("puts the focus on continuing, so the keyboard lands inside it", () => {
    renderCelebration();

    expect(screen.getByRole("button", { name: "passport.celebrationContinue" })).toHaveFocus();
  });

  it("goes away on continue or Escape", () => {
    const { onDismiss } = renderCelebration();

    fireEvent.click(screen.getByRole("button", { name: "passport.celebrationContinue" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("opens the card of that country in the passport to share it", () => {
    const { onShare } = renderCelebration();

    fireEvent.click(screen.getByRole("button", { name: "passport.celebrationShare" }));

    expect(mockNavigate).toHaveBeenCalledWith("/profile/u1/passport?share=moment&country=IT");
    expect(onShare).toHaveBeenCalled();
  });

  it("opens the card of that badge to share it", () => {
    renderCelebration({ celebration: BADGE });

    fireEvent.click(screen.getByRole("button", { name: "passport.celebrationShare" }));

    expect(mockNavigate).toHaveBeenCalledWith("/profile/u1/passport?share=moment&badge=explorer");
  });

  it("says how many are left when several arrived together", () => {
    renderCelebration({ position: 2, total: 3 });

    expect(screen.getByText('passport.celebrationProgress:{"current":2,"total":3}')).toBeInTheDocument();
  });

  it("does not count a single celebration", () => {
    renderCelebration();

    expect(screen.queryByText(/passport.celebrationProgress/)).not.toBeInTheDocument();
  });

  it("records each celebration shown, with what was celebrated", () => {
    renderCelebration();

    expect(trackEvent).toHaveBeenCalledWith("achievement_celebrated", { moment: "country" });
  });
});
