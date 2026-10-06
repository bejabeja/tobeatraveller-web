import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, vars) => (vars?.returnObjects ? [`${key}#1`, `${key}#2`] : key),
  }),
}));
jest.mock("../../hooks/usePageMeta", () => ({ usePageMeta: jest.fn() }));

import Terms from "./Terms";

const renderTerms = () => render(<MemoryRouter><Terms /></MemoryRouter>);

// The terms said nothing about paying: what is charged, the automatic renewal
// and, above all, the right of withdrawal the checkout asks the customer to
// give up, which is only valid if it was explained.
describe("Terms", () => {
  it("explains the Premium subscription: payments, renewal and the right of withdrawal", () => {
    renderTerms();

    expect(screen.getByText("legalTerms.subscriptionsTitle")).toBeInTheDocument();
    expect(screen.getByText("legalTerms.subscriptionsIntro")).toBeInTheDocument();
    expect(screen.getByText("legalTerms.subscriptionsItems#1")).toBeInTheDocument();
    expect(screen.getByText("legalTerms.subscriptionsWithdrawal#1")).toBeInTheDocument();
    expect(screen.getByText("legalTerms.subscriptionsWithdrawal#2")).toBeInTheDocument();
  });

  // The law asks the terms to describe how content is moderated, and the app to say how to reach us.
  it("explains how content is reported and moderated, right after the prohibited conduct", () => {
    renderTerms();

    expect(screen.getByText("legalTerms.moderationBody#1")).toBeInTheDocument();
    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(titles.indexOf("legalTerms.moderationTitle")).toBe(titles.indexOf("legalTerms.s5Title") + 1);
  });

  it("puts it after the privacy section and before the rest", () => {
    renderTerms();

    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(titles.indexOf("legalTerms.subscriptionsTitle")).toBe(titles.indexOf("legalTerms.s6Title") + 1);
    expect(titles.indexOf("legalTerms.s7Title")).toBe(titles.indexOf("legalTerms.subscriptionsTitle") + 1);
  });
});
