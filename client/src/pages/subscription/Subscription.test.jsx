import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let mockMe = { id: "user-1", isPremium: false, isTrialEligible: true };

jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));
jest.mock("../../store/auth/authSelectors", () => ({
  selectAuthUser: () => ({ id: "user-1" }),
  selectIsAuthenticated: () => true,
}));
jest.mock("../../store/user/userInfoSelectors", () => ({ selectMe: () => mockMe }));
jest.mock("../../store/user/userInfoActions", () => ({ setUserInfo: jest.fn() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars?.count !== undefined ? `${key}:${vars.count}` : key), i18n: { language: "es" } }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }) }));
jest.mock("../../services/subscription", () => ({
  createCheckoutSession: jest.fn(), createPortalSession: jest.fn(), getMySubscription: jest.fn(), resumeSubscription: jest.fn(),
}));
jest.mock("../../utils/preloadImg", () => ({ preloadImg: jest.fn() }));
jest.mock("../../hooks/useScrollReveal", () => ({ useScrollReveal: () => null }));

import Subscription from "./Subscription";

const renderPage = () => render(<MemoryRouter><Subscription /></MemoryRouter>);

describe("Subscription", () => {
  beforeEach(() => {
    mockMe = { id: "user-1", isPremium: false, isTrialEligible: true };
  });

  // Either plan starts with the free trial the first time.
  it("offers the free trial on both plans to someone who never subscribed", () => {
    renderPage();

    expect(screen.getAllByRole("button", { name: "subscription.ctaStartTrial" })).toHaveLength(2);
  });

  it("offers to subscribe once the trial has been used", () => {
    mockMe = { ...mockMe, isTrialEligible: false };
    renderPage();

    expect(screen.getAllByRole("button", { name: "subscription.ctaSubscribe" })).toHaveLength(2);
  });

  // Regression: the page sold Expenses, the shopping list and the diary as
  // Premium, when they are free up to 10.
  it("compares the plans with the free limits instead of listing everything as Premium", () => {
    renderPage();

    const table = screen.getByRole("table");
    expect(table).toHaveTextContent("subscription.featureVanLogTitle");
    expect(screen.getAllByText("subscription.compareUpTo:10")).toHaveLength(3);
    expect(screen.getAllByLabelText("subscription.compareNotIncluded")).toHaveLength(3);
    expect(screen.queryByText("subscription.featureNoAdsTitle")).not.toBeInTheDocument();
  });
});
