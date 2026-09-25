import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PassportShareDialog from "./PassportShareDialog.jsx";

// Stable like the real one: the hook rebuilds the image whenever `t` changes.
const mockT = (key) => key;
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

jest.mock("react-hot-toast", () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));

jest.mock("../../services/referral", () => ({
  getMyReferralInfo: jest.fn(),
}));

jest.mock("../../services/passport", () => ({
  getUserPassport: jest.fn(),
}));

jest.mock("../../utils/passportShareImage", () => ({
  createPassportShareImage: jest.fn(),
}));

import toast from "react-hot-toast";
import { getUserPassport } from "../../services/passport";
import { getMyReferralInfo } from "../../services/referral";
import { trackEvent } from "../../utils/analytics";
import { createPassportShareImage } from "../../utils/passportShareImage";

const PUBLIC_PASSPORT = {
  owner: { id: "user-1", username: "jane" },
  achievements: [{ id: "explorer", family: "trips", threshold: 1, earnedAt: "2026-09-01", isPrivate: false }],
  countries: [{ code: "ES", firstVisitedOn: "2026-03-01", isPrivate: false }],
};

// Sharing waits until the image and the referral code are both ready.
const findEnabledShareButton = async () => {
  const button = await screen.findByRole("button", { name: "passport.shareImage" });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
};

const renderDialog = () => render(<PassportShareDialog userId="user-1" isOpen onClose={jest.fn()} />);

describe("PassportShareDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL = jest.fn(() => "blob:passport");
    global.URL.revokeObjectURL = jest.fn();
    getUserPassport.mockResolvedValue(PUBLIC_PASSPORT);
    getMyReferralInfo.mockResolvedValue({ referralCode: "jane" });
    Object.defineProperty(navigator, "clipboard", { value: { writeText: jest.fn().mockResolvedValue() }, configurable: true });
    createPassportShareImage.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    delete navigator.share;
    delete navigator.canShare;
  });

  it("builds the image from the public countries only by default, and says so", async () => {
    renderDialog();

    expect(await screen.findByRole("img")).toHaveAttribute("src", "blob:passport");
    expect(getUserPassport).toHaveBeenCalledWith("user-1", { publicView: true });
    expect(createPassportShareImage.mock.calls[0][0].summary).toMatchObject({ username: "jane", flagCodes: ["ES"], showAchievements: false });
    expect(screen.getByLabelText("passport.shareIncludeAchievements")).not.toBeChecked();
    expect(screen.getByText("passport.sharePublicOnly")).toBeInTheDocument();
  });

  it("redraws the image with the achievements when included, without fetching the passport again", async () => {
    renderDialog();
    await screen.findByRole("img");

    fireEvent.click(screen.getByLabelText("passport.shareIncludeAchievements"));

    await waitFor(() => expect(createPassportShareImage).toHaveBeenCalledTimes(2));
    expect(createPassportShareImage.mock.calls[1][0].summary).toMatchObject({ showAchievements: true, stampIds: ["explorer"] });
    expect(getUserPassport).toHaveBeenCalledTimes(1);
  });

  it("keeps the achievements on, and not switchable, when there are no countries to show", async () => {
    getUserPassport.mockResolvedValue({ ...PUBLIC_PASSPORT, countries: [] });
    renderDialog();
    await screen.findByRole("img");

    const toggle = screen.getByLabelText("passport.shareIncludeAchievements");
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
  });

  it("rebuilds the image from the full passport, with a warning, when the owner includes private ones", async () => {
    renderDialog();
    await screen.findByRole("img");

    fireEvent.click(screen.getByLabelText("passport.shareIncludePrivate"));

    await waitFor(() => expect(getUserPassport).toHaveBeenLastCalledWith("user-1", { publicView: false }));
    expect(screen.getByRole("alert")).toHaveTextContent("passport.shareIncludesPrivate");
  });

  it("goes back to public countries only the next time it opens", async () => {
    const { rerender } = renderDialog();
    await screen.findByRole("img");
    fireEvent.click(screen.getByLabelText("passport.shareIncludePrivate"));
    fireEvent.click(screen.getByLabelText("passport.shareIncludeAchievements"));

    rerender(<PassportShareDialog userId="user-1" isOpen={false} onClose={jest.fn()} />);
    rerender(<PassportShareDialog userId="user-1" isOpen onClose={jest.fn()} />);

    expect(await screen.findByLabelText("passport.shareIncludePrivate")).not.toBeChecked();
    expect(screen.getByLabelText("passport.shareIncludeAchievements")).not.toBeChecked();
    await waitFor(() => expect(getUserPassport).toHaveBeenLastCalledWith("user-1", { publicView: true }));
  });

  it("shares the image file with a link that credits the owner's referral code", async () => {
    navigator.canShare = jest.fn(() => true);
    navigator.share = jest.fn().mockResolvedValue();
    renderDialog();
    await waitFor(() => expect(getMyReferralInfo).toHaveBeenCalled());

    fireEvent.click(await findEnabledShareButton());

    await waitFor(() => expect(navigator.share).toHaveBeenCalledTimes(1));
    const [{ files, text }] = navigator.share.mock.calls[0];
    expect(files[0].type).toBe("image/png");
    expect(text).toContain("/profile/user-1/passport?ref=jane");
  });

  // An Instagram story drops the shared text, so the link goes to the
  // clipboard, ready for a link sticker.
  it("copies the link when sharing and says so", async () => {
    navigator.canShare = jest.fn(() => true);
    navigator.share = jest.fn().mockResolvedValue();
    renderDialog();
    await waitFor(() => expect(getMyReferralInfo).toHaveBeenCalled());

    fireEvent.click(await findEnabledShareButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("passport.linkCopied"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("/profile/user-1/passport?ref=jane"));
  });

  it("does not let the owner share before the referral code is known", async () => {
    let resolveReferral;
    getMyReferralInfo.mockReturnValue(new Promise((resolve) => { resolveReferral = resolve; }));
    navigator.canShare = jest.fn(() => true);
    renderDialog();
    await screen.findByRole("img");

    expect(screen.getByRole("button", { name: "passport.shareImage" })).toBeDisabled();

    resolveReferral({ referralCode: "jane" });
    await waitFor(() => expect(screen.getByRole("button", { name: "passport.shareImage" })).toBeEnabled());
  });

  // A phone must not flash the desktop (download-only) instructions while
  // the image is still being drawn.
  it("knows the browser can share before the image is ready", async () => {
    createPassportShareImage.mockReturnValue(new Promise(() => {}));
    navigator.canShare = jest.fn(() => true);
    renderDialog();

    expect(await screen.findByText("passport.linkHint")).toBeInTheDocument();
    expect(screen.queryByLabelText("passport.linkLabel")).not.toBeInTheDocument();
  });

  it("still shares, without the referral code, when it cannot be loaded", async () => {
    getMyReferralInfo.mockRejectedValue(new Error("offline"));
    navigator.canShare = jest.fn(() => true);
    navigator.share = jest.fn().mockResolvedValue();
    renderDialog();

    fireEvent.click(await findEnabledShareButton());

    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(navigator.share.mock.calls[0][0].text).toMatch(/\/profile\/user-1\/passport$/);
  });

  it("prints only the site address on the image, since a link in a picture can't be tapped", async () => {
    renderDialog();
    await screen.findByRole("img");

    expect(createPassportShareImage.mock.calls[0][0].displayUrl).toBe(window.location.host);
  });

  it("opens with the achievements on when asked, as from a badge notification", async () => {
    render(<PassportShareDialog userId="user-1" isOpen onClose={jest.fn()} initialIncludeAchievements />);

    await waitFor(() => expect(screen.getByLabelText("passport.shareIncludeAchievements")).toBeChecked());
    await waitFor(() => expect(createPassportShareImage.mock.calls.at(-1)[0].summary.showAchievements).toBe(true));
  });

  it("only offers the download where the browser cannot share files", async () => {
    renderDialog();

    await screen.findByRole("img");
    expect(screen.queryByText("passport.shareImage")).not.toBeInTheDocument();
    expect(screen.getByText("passport.downloadImage")).toBeEnabled();
  });

  // Posted from the phone, where this computer's clipboard doesn't reach:
  // the link is shown so it can be passed on, and copied on request.
  it("shows the link to pass on, with a copy button, when the image can only be downloaded", async () => {
    renderDialog();
    await screen.findByRole("img");
    await waitFor(() => expect(screen.getByLabelText("passport.linkLabel")).toHaveValue(`${window.location.origin}/profile/user-1/passport?ref=jane`));

    fireEvent.click(screen.getByText("passport.copyLink"));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("passport.linkCopiedPlain"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("?ref=jane"));
    expect(screen.queryByText("passport.linkHint")).not.toBeInTheDocument();
  });

  it("explains the link sticker instead where the image can be shared", async () => {
    navigator.canShare = jest.fn(() => true);
    renderDialog();

    await screen.findByText("passport.shareImage");
    expect(screen.getByText("passport.linkHint")).toBeInTheDocument();
    expect(screen.queryByLabelText("passport.linkLabel")).not.toBeInTheDocument();
  });

  it("does not report an error when the user closes the share sheet", async () => {
    navigator.canShare = jest.fn(() => true);
    navigator.share = jest.fn().mockRejectedValue(Object.assign(new Error("cancelled"), { name: "AbortError" }));
    renderDialog();

    fireEvent.click(await findEnabledShareButton());

    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("tells the owner what they win when someone signs up from their link", async () => {
    renderDialog();

    expect(await screen.findByText("passport.shareReward")).toBeInTheDocument();
  });

  // Without their code in the link, the promise would be false.
  it("does not promise the reward when the referral code cannot be loaded", async () => {
    getMyReferralInfo.mockRejectedValue(new Error("offline"));
    renderDialog();
    await waitFor(() => expect(screen.getByText("passport.downloadImage")).toBeEnabled());

    expect(screen.queryByText("passport.shareReward")).not.toBeInTheDocument();
  });

  it("records where it was opened from", async () => {
    render(<PassportShareDialog userId="user-1" isOpen onClose={jest.fn()} source="notification" />);

    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith("passport_share_opened", { source: "notification" }));
  });

  it("records a share with its method and counts, but nothing personal", async () => {
    navigator.canShare = jest.fn(() => true);
    navigator.share = jest.fn().mockResolvedValue();
    renderDialog();

    fireEvent.click(await findEnabledShareButton());

    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith("passport_shared", {
      method: "share_sheet", source: "passport_page", with_achievements: false, with_private: false, countries: 1, stamps: 0,
    }));
    const sent = JSON.stringify(trackEvent.mock.calls);
    expect(sent).not.toContain("jane");
    expect(sent).not.toContain("ES");
  });

  it("does not record a share when the user closes the share sheet", async () => {
    navigator.canShare = jest.fn(() => true);
    navigator.share = jest.fn().mockRejectedValue(Object.assign(new Error("cancelled"), { name: "AbortError" }));
    renderDialog();

    fireEvent.click(await findEnabledShareButton());

    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(trackEvent).not.toHaveBeenCalledWith("passport_shared", expect.anything());
  });

  it("records a download and a copied link as shares too", async () => {
    renderDialog();
    await waitFor(() => expect(screen.getByText("passport.downloadImage")).toBeEnabled());

    fireEvent.click(screen.getByText("passport.downloadImage"));
    fireEvent.click(screen.getByText("passport.copyLink"));

    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith("passport_shared", expect.objectContaining({ method: "copy_link" })));
    expect(trackEvent).toHaveBeenCalledWith("passport_shared", expect.objectContaining({ method: "download" }));
  });

  it("shows an error when the passport cannot be loaded", async () => {
    getUserPassport.mockRejectedValue(new Error("offline"));
    renderDialog();

    expect(await screen.findByText("passport.shareError")).toBeInTheDocument();
  });
});
