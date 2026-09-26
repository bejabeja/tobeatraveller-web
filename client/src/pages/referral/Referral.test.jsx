import { render, screen } from "@testing-library/react";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../services/referral", () => ({ getMyReferralInfo: jest.fn() }));

import { getMyReferralInfo } from "../../services/referral";
import Referral from "./Referral";

const INVITES = [
  { id: "i1", status: "rewarded", referredUser: { username: "ana", avatarUrl: null } },
  { id: "i2", status: "pending", referredUser: { username: "leo", avatarUrl: null } },
];

describe("Referral page", () => {
  it("offers the reward for both, and ways to share the link", async () => {
    getMyReferralInfo.mockResolvedValue({ referralCode: "tbat", invited: 0, rewarded: 0, invites: [] });

    render(<Referral />);

    await screen.findByText("tbat");
    expect(screen.getByText("referral.rewardForFriend")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /referral.shareButton/ })).toBeEnabled();
    expect(screen.getByRole("link", { name: /referral.shareWhatsApp/ }).getAttribute("href"))
      .toContain(encodeURIComponent("/register?ref=tbat"));
  });

  // Signing up in the app there is no link to follow.
  it("gives the code to type when signing up from the app", async () => {
    getMyReferralInfo.mockResolvedValue({ referralCode: "tbat", invited: 0, rewarded: 0, invites: [] });

    render(<Referral />);

    expect(await screen.findByText("tbat")).toBeInTheDocument();
  });

  // Regression: a first visit showed "0" and "0" as the progress.
  it("nudges to a first invite instead of showing zeros", async () => {
    getMyReferralInfo.mockResolvedValue({ referralCode: "tbat", invited: 0, rewarded: 0, invites: [] });

    render(<Referral />);

    expect(await screen.findByText("referral.firstInviteHint")).toBeInTheDocument();
    expect(screen.queryByText("referral.statsInvited")).not.toBeInTheDocument();
  });

  it("shows who was invited and whether their month was unlocked", async () => {
    getMyReferralInfo.mockResolvedValue({ referralCode: "tbat", invited: 2, rewarded: 1, invites: INVITES });

    render(<Referral />);

    expect(await screen.findByText("@ana")).toBeInTheDocument();
    expect(screen.getByText("referral.inviteStatusRewarded")).toBeInTheDocument();
    expect(screen.getByText("referral.inviteStatusPending")).toBeInTheDocument();
    expect(screen.queryByText("referral.firstInviteHint")).not.toBeInTheDocument();
  });
});
