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
