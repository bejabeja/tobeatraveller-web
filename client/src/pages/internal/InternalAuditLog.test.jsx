import { render, screen } from "@testing-library/react";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join("/")}` : key), i18n: { language: "es" } }),
}));
jest.mock("../../services/auditLog", () => ({ getRecentAuditLog: jest.fn() }));

import { getRecentAuditLog } from "../../services/auditLog";
import InternalAuditLog from "./InternalAuditLog";

const tierEntry = (id, metadata) => ({
  id, action: "tier_updated", actorUsername: "root", targetUsername: "jane", createdAt: "2026-09-27T10:00:00Z", metadata,
});

// Regression: premium changes showed as the raw "tier_updated".
it("says what was done with someone's premium", async () => {
  getRecentAuditLog.mockResolvedValue({
    entries: [
      tierEntry("a", { newTier: "premium", months: 3 }),
      tierEntry("b", { newTier: "premium", months: null }),
      tierEntry("c", { newTier: "free" }),
    ],
    total: 3,
  });

  render(<InternalAuditLog />);

  expect(await screen.findByText("admin.auditPremiumGiftedMonths:root/jane/3")).toBeInTheDocument();
  expect(screen.getByText("admin.auditPremiumGiftedIndefinite:root/jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditPremiumRemoved:root/jane")).toBeInTheDocument();
});

// The subscription funnel read from the webhook: it needs to be legible, and
// a trial that ended unpaid has to read differently from a paid cancellation.
it("tells the steps of a subscription apart, and a trial from a paid plan", async () => {
  const entry = (id, action, metadata) => ({
    id, action, actorUsername: null, targetUsername: "jane", createdAt: "2026-09-27T10:00:00Z", metadata,
  });
  getRecentAuditLog.mockResolvedValue({
    entries: [
      entry("a", "subscription_started", { status: "trialing" }),
      entry("b", "subscription_started", { status: "active" }),
      entry("c", "subscription_canceled", { previousStatus: "trialing" }),
      entry("d", "subscription_canceled", { previousStatus: "active" }),
      entry("e", "subscription_cancellation_scheduled", { status: "trialing" }),
      entry("f", "subscription_cancellation_scheduled", { status: "active" }),
      entry("g", "subscription_trial_converted", { status: "active" }),
      entry("h", "subscription_payment_failed", { status: "past_due" }),
      entry("i", "subscription_resumed", { status: "active" }),
      entry("j", "subscription_refunded", { chargeId: "ch_1" }),
      entry("k", "subscription_disputed", { chargeId: "ch_1", disputeId: "dp_1" }),
      entry("l", "subscription_terms_accepted", { termsVersion: "2026-09-30", plan: "annual", startTrial: false }),
    ],
    total: 12,
  });

  render(<InternalAuditLog />);

  expect(await screen.findByText("admin.auditSubscriptionTrialStarted:jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditSubscriptionStarted:jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditSubscriptionTrialExpired:jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditSubscriptionEnded:jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditTrialCanceled:jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditSubscriptionCancellationScheduled:jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditTrialConverted:jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditSubscriptionPaymentFailed:jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditSubscriptionResumed:jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditSubscriptionRefunded:jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditSubscriptionDisputed:jane")).toBeInTheDocument();
  expect(screen.getByText("admin.auditSubscriptionTermsAccepted:jane")).toBeInTheDocument();
});
