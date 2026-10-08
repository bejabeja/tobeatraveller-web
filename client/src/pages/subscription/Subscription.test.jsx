import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { formatDate } from "@tobeatraveller/shared";

let mockMe = { id: "user-1", isPremium: false, isTrialEligible: true };
let mockAuthUser = { id: "user-1" };
let mockIsAuthenticated = true;

const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => mockDispatch,
}));
jest.mock("../../store/auth/authSelectors", () => ({
  selectAuthUser: () => mockAuthUser,
  selectIsAuthenticated: () => mockIsAuthenticated,
}));
jest.mock("../../store/user/userInfoSelectors", () => ({ selectMe: () => mockMe }));
jest.mock("../../store/user/userInfoActions", () => ({ setUserInfo: jest.fn() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars?.count !== undefined ? `${key}:${vars.count}` : vars?.date ? `${key}:${vars.date}` : key), i18n: { language: "es" } }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }) }));
jest.mock("../../services/subscription", () => ({
  createCheckoutSession: jest.fn(), createPortalSession: jest.fn(), getMySubscription: jest.fn(), resumeSubscription: jest.fn(),
}));
jest.mock("../../utils/preloadImg", () => ({ preloadImg: jest.fn() }));
jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../hooks/useScrollReveal", () => ({ useScrollReveal: () => null }));

import { createCheckoutSession, getMySubscription, createPortalSession } from "../../services/subscription";
import { trackEvent } from "../../utils/analytics";
import Subscription from "./Subscription";

const pageAt = (path) => <MemoryRouter initialEntries={[path]}><Subscription /></MemoryRouter>;
const renderPage = (path = "/subscription") => {
  const utils = render(pageAt(path));
  return { ...utils, rerenderPage: () => utils.rerender(pageAt(path)) };
};

const eventsNamed = (name) => trackEvent.mock.calls.filter(([event]) => event === name);

describe("Subscription", () => {
  beforeEach(() => {
    mockMe = { id: "user-1", isPremium: false, isTrialEligible: true };
    mockAuthUser = { id: "user-1" };
    mockIsAuthenticated = true;
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
    // The packing lists are free up to two lists.
    expect(screen.getByText("subscription.compareUpTo:2")).toBeInTheDocument();
    expect(screen.getAllByLabelText("subscription.compareNotIncluded")).toHaveLength(2);
    expect(screen.queryByText("subscription.featureNoAdsTitle")).not.toBeInTheDocument();
  });

  describe("when the user is Premium", () => {
    const IN_TWO_WEEKS = new Date(Date.now() + 14 * 86400000).toISOString();
    const date = (iso) => formatDate(iso, "es");
    const paidSubscription = (overrides = {}) => ({ status: "active", currentPeriodEnd: IN_TWO_WEEKS, cancelAtPeriodEnd: false, ...overrides });
    const renderPremium = async (subscription, premiumUntil = IN_TWO_WEEKS) => {
      mockMe = { id: "user-1", isPremium: true, premiumUntil };
      getMySubscription.mockResolvedValue(subscription);
      renderPage();
      await act(async () => {});
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("is not sold Premium again: the page is about their subscription, not the pitch", async () => {
      await renderPremium(paidSubscription());

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("subscription.yourPremiumTitle");
      expect(screen.queryByText("subscription.subtitle")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "subscription.ctaSubscribe" })).not.toBeInTheDocument();
    });

    it("tells a paying customer when the subscription renews, and lets them manage it", async () => {
      await renderPremium(paidSubscription());

      expect(screen.getByText(`subscription.renewsOn:${date(IN_TWO_WEEKS)}`)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "subscription.manageLink" })).toBeInTheDocument();
    });

    // Regression: Premium that came as a gift or a referral reward has no Stripe
    // customer, so the billing portal failed with "No subscription found".
    it("offers no billing to someone whose Premium is a gift, and says until when they have it", async () => {
      await renderPremium(null);

      expect(screen.getByText(`subscription.premiumUntilDesc:${date(IN_TWO_WEEKS)}`)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "subscription.manageLink" })).not.toBeInTheDocument();
      expect(createPortalSession).not.toHaveBeenCalled();
    });

    it("greets someone whose Premium has no end date as a guest of honour, without a date a century away", async () => {
      await renderPremium(null, "2126-08-08T00:00:00.000Z");

      expect(screen.getByRole("heading", { name: "subscription.guestTitle" })).toBeInTheDocument();
      expect(screen.getByText("subscription.guestDesc")).toBeInTheDocument();
      expect(screen.queryByText(/subscription.premiumUntilDesc/)).not.toBeInTheDocument();
    });

    it("keeps the way to billing when the subscription could not be read, as they may well be paying", async () => {
      mockMe = { id: "user-1", isPremium: true, premiumUntil: IN_TWO_WEEKS };
      getMySubscription.mockRejectedValue(new Error("offline"));
      renderPage();
      await act(async () => {});

      expect(screen.getByRole("button", { name: "subscription.manageLink" })).toBeInTheDocument();
    });

    it("shows a canceled subscription as ending, not as the green confirmation, with the way back", async () => {
      await renderPremium(paidSubscription({ cancelAtPeriodEnd: true }));

      expect(screen.getByText("subscription.canceledTitle")).toBeInTheDocument();
      expect(screen.queryByText("subscription.alreadyPremiumTitle")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "subscription.ctaResume" })).toBeInTheDocument();
    });

    it("shows the failed payment, and never the reassuring state first", async () => {
      let resolveSubscription;
      getMySubscription.mockReturnValue(new Promise((resolve) => { resolveSubscription = resolve; }));
      mockMe = { id: "user-1", isPremium: true, premiumUntil: IN_TWO_WEEKS };
      renderPage();

      expect(screen.queryByText("subscription.alreadyPremiumTitle")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "subscription.manageLink" })).not.toBeInTheDocument();

      await act(async () => { resolveSubscription(paidSubscription({ status: "past_due" })); });

      expect(screen.getByText("subscription.paymentFailedTitle")).toBeInTheDocument();
      expect(screen.queryByText("subscription.alreadyPremiumTitle")).not.toBeInTheDocument();
    });
  });

  describe("right after paying", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      mockMe = { id: "user-1", isPremium: false, isTrialEligible: true };
    });
    afterEach(() => jest.useRealTimers());

    it("says the Premium is being activated instead of showing the plans again", () => {
      renderPage("/subscription?checkout=success");

      expect(screen.getByText("subscription.activatingTitle")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "subscription.ctaStartTrial" })).not.toBeInTheDocument();
    });

    // Regression: the retries were cancelled as soon as the param left the URL,
    // so a webhook that landed a few seconds late was never picked up.
    // Regression: with the user still loading, the param was removed without
    // starting the wait, and someone who had just paid saw the plans again.
    it("still waits for the activation when the user finishes loading after coming back from paying", () => {
      mockAuthUser = {};
      const { rerenderPage } = renderPage("/subscription?checkout=success");
      expect(screen.queryByText("subscription.activatingTitle")).not.toBeInTheDocument();

      mockAuthUser = { id: "user-1" };
      rerenderPage();

      expect(screen.getByText("subscription.activatingTitle")).toBeInTheDocument();
    });

    it("keeps asking for the user while the webhook is late", () => {
      renderPage("/subscription?checkout=success");
      const askedRightAway = mockDispatch.mock.calls.length;

      act(() => { jest.advanceTimersByTime(8000); });

      expect(mockDispatch.mock.calls.length).toBe(askedRightAway + 3);
    });

    // Regression: the plans came back after the wait, inviting someone who had
    // just paid to pay again.
    it("says it is late instead of selling Premium again if the activation never arrives", () => {
      renderPage("/subscription?checkout=success");

      act(() => { jest.advanceTimersByTime(13000); });

      expect(screen.getByText("subscription.activationDelayedTitle")).toBeInTheDocument();
      expect(screen.queryByText("subscription.activatingTitle")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "subscription.ctaStartTrial" })).not.toBeInTheDocument();
    });

    it("waits and asks for the user again when checking again", () => {
      renderPage("/subscription?checkout=success");
      act(() => { jest.advanceTimersByTime(13000); });
      const askedBefore = mockDispatch.mock.calls.length;

      fireEvent.click(screen.getByRole("button", { name: "subscription.activationDelayedCta" }));

      expect(mockDispatch.mock.calls.length).toBe(askedBefore + 1);
      expect(screen.getByText("subscription.activatingTitle")).toBeInTheDocument();
    });
  });
  describe("analytics", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      mockMe = { id: "user-1", isPremium: false, isTrialEligible: true };
    });
    afterEach(() => jest.useRealTimers());

    it("records which state the page was seen in, once", () => {
      const { rerenderPage } = renderPage();
      rerenderPage();

      expect(eventsNamed("subscription_page_viewed")).toEqual([["subscription_page_viewed", { view: "plans" }]]);
    });

    it("waits for the profile so a Premium user is not recorded as seeing the plans", () => {
      mockMe = undefined;
      const { rerenderPage } = renderPage();
      expect(eventsNamed("subscription_page_viewed")).toHaveLength(0);

      mockMe = { id: "user-1", isPremium: true };
      getMySubscription.mockReturnValue(new Promise(() => {}));
      rerenderPage();

      expect(eventsNamed("subscription_page_viewed")).toHaveLength(0);
    });

    it("records the activation wait, not the plans, when coming back from paying", () => {
      renderPage("/subscription?checkout=success");

      expect(eventsNamed("subscription_page_viewed")).toEqual([["subscription_page_viewed", { view: "activating" }]]);
    });

    it("records that the payment went through once Premium arrives", () => {
      const { rerenderPage } = renderPage("/subscription?checkout=success");
      getMySubscription.mockResolvedValue({ status: "trialing", currentPeriodEnd: "2026-10-13T00:00:00.000Z", cancelAtPeriodEnd: false });

      mockMe = { id: "user-1", isPremium: true };
      rerenderPage();
      rerenderPage();

      expect(eventsNamed("checkout_completed")).toHaveLength(1);
    });

    it("does not record a completed checkout for someone who was already Premium", () => {
      mockMe = { id: "user-1", isPremium: true };
      getMySubscription.mockResolvedValue(null);
      renderPage();

      expect(eventsNamed("checkout_completed")).toHaveLength(0);
    });

    it("records when the activation runs late", () => {
      renderPage("/subscription?checkout=success");

      act(() => { jest.advanceTimersByTime(13000); });

      expect(eventsNamed("activation_delayed")).toHaveLength(1);
    });
  });
  describe("deciding whether to subscribe", () => {
    it("shows what the yearly plan costs per month, only on the yearly plan", () => {
      renderPage();

      expect(screen.getAllByText("subscription.annualPerMonth")).toHaveLength(1);
    });

    // Regression-in-waiting: the answers state what the API does (a trial with
    // no card that ends by canceling), so they have to stay on the page.
    it("answers the doubts that hold people back, one tap away", () => {
      renderPage();

      expect(screen.getByText("subscription.faqTitle")).toBeInTheDocument();
      ["Trial", "Cancel", "Data", "Ads", "Invoices"].forEach((topic) => {
        expect(screen.getByText(`subscription.faq${topic}Question`)).toBeInTheDocument();
        expect(screen.getByText(`subscription.faq${topic}Answer`)).toBeInTheDocument();
      });
    });

    it("keeps a way to contact us for someone who is already Premium", async () => {
      mockMe = { id: "user-1", isPremium: true };
      getMySubscription.mockResolvedValue(null);
      renderPage();

      expect(screen.getByRole("link", { name: "subscription.helpLink" })).toHaveAttribute("href", "/contact");
    });

    it("does not pitch the FAQ to someone who is already Premium", async () => {
      mockMe = { id: "user-1", isPremium: true };
      getMySubscription.mockResolvedValue(null);
      renderPage();

      expect(screen.queryByText("subscription.faqTitle")).not.toBeInTheDocument();
    });
  });

  describe("right after Premium is activated", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      mockMe = { id: "user-1", isPremium: false, isTrialEligible: true };
    });
    afterEach(() => jest.useRealTimers());

    const payAndBecomePremium = () => {
      const { rerenderPage } = renderPage("/subscription?checkout=success");
      getMySubscription.mockResolvedValue({ status: "trialing", currentPeriodEnd: "2026-10-13T00:00:00.000Z", cancelAtPeriodEnd: false });
      mockMe = { id: "user-1", isPremium: true };
      rerenderPage();
      rerenderPage();
    };

    it("welcomes the new subscriber and points to what to try first", () => {
      payAndBecomePremium();

      expect(screen.getByText("subscription.welcomeTitle")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /subscription.featureAiItineraries/ })).toHaveAttribute("href", "/create-itinerary");
      expect(screen.getByRole("link", { name: /subscription.featurePackingChecklistTitle/ })).toHaveAttribute("href", "/packing-checklist");
      expect(screen.getByRole("link", { name: /subscription.featureVanLogTitle/ })).toHaveAttribute("href", "/van-log");
    });

    it("does not welcome someone who was already Premium when they opened the page", () => {
      mockMe = { id: "user-1", isPremium: true };
      getMySubscription.mockResolvedValue(null);
      renderPage();

      expect(screen.queryByText("subscription.welcomeTitle")).not.toBeInTheDocument();
    });
  });
  describe("choosing between the free trial and paying right away", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockMe = { id: "user-1", isPremium: false, isTrialEligible: true };
      createCheckoutSession.mockRejectedValue(new Error("stop before leaving the page"));
    });

    it("offers to subscribe now, without the trial, on each plan", () => {
      renderPage();

      expect(screen.getAllByRole("button", { name: "subscription.ctaSubscribeNow" })).toHaveLength(2);
    });

    it("starts the trial from the main button", () => {
      renderPage();

      fireEvent.click(screen.getAllByRole("button", { name: "subscription.ctaStartTrial" })[0]);

      expect(createCheckoutSession).toHaveBeenCalledWith("monthly", { startTrial: true });
    });

    it("skips the trial for someone who prefers to pay now", () => {
      renderPage();

      fireEvent.click(screen.getAllByRole("button", { name: "subscription.ctaSubscribeNow" })[1]);

      expect(createCheckoutSession).toHaveBeenCalledWith("annual", { startTrial: false });
    });

    it("records which way the traveller chose", async () => {
      createCheckoutSession.mockResolvedValue({ url: "#" });
      renderPage();

      await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: "subscription.ctaSubscribeNow" })[1]); });

      expect(trackEvent).toHaveBeenCalledWith("checkout_started", { plan: "annual", trial: false });
    });

    // Regression: the API can answer a Subscribe with the billing portal (a
    // payment is pending on a subscription that is still alive); it was counted as
    // a checkout that never happened.
    it("does not count as a checkout what was sent to the billing portal", async () => {
      createCheckoutSession.mockResolvedValue({ url: "#", kind: "billing_portal" });
      renderPage();

      await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: "subscription.ctaStartTrial" })[0]); });

      expect(trackEvent).not.toHaveBeenCalledWith("checkout_started", expect.anything());
      expect(trackEvent).toHaveBeenCalledWith("subscription_portal_opened", { view: "plans" });
    });

    // Regression: only the plan being started was blocked, so another button could
    // start a second checkout session while the first was in flight.
    it("blocks every button while a checkout is starting", () => {
      createCheckoutSession.mockReturnValue(new Promise(() => {}));
      renderPage();

      fireEvent.click(screen.getAllByRole("button", { name: "subscription.ctaStartTrial" })[0]);

      screen.getAllByRole("button", { name: /subscription\.(ctaStartTrial|ctaLoading|ctaSubscribeNow)/ })
        .forEach((button) => expect(button).toBeDisabled());
    });

    it("does not offer it to someone who has no trial to skip", () => {
      mockMe = { ...mockMe, isTrialEligible: false };
      renderPage();

      expect(screen.queryByRole("button", { name: "subscription.ctaSubscribeNow" })).not.toBeInTheDocument();
    });
  });
  // The customer gives up the right of withdrawal only by asking for the service to
  // start right away and acknowledging it, and that is asked on the Stripe page,
  // next to the payment button: this page adds no step of its own.
  describe("consent to start right away", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockMe = { id: "user-1", isPremium: false, isTrialEligible: true };
      createCheckoutSession.mockRejectedValue(new Error("stop before leaving the page"));
    });

    it("keeps the page about the plans, with no checkbox and no dialog", () => {
      renderPage();

      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("goes straight to the payment when choosing to pay, with no step in between", () => {
      renderPage();

      fireEvent.click(screen.getAllByRole("button", { name: "subscription.ctaSubscribeNow" })[1]);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(createCheckoutSession).toHaveBeenCalledWith("annual", { startTrial: false });
    });

    it("does the same for someone with no trial left, who is charged right away", () => {
      mockMe = { ...mockMe, isTrialEligible: false };
      renderPage();

      fireEvent.click(screen.getAllByRole("button", { name: "subscription.ctaSubscribe" })[0]);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(createCheckoutSession).toHaveBeenCalledWith("monthly", { startTrial: true });
    });
  });
});
