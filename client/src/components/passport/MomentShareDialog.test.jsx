import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MomentShareDialog from "./MomentShareDialog.jsx";

const mockT = (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key);
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT, i18n: { language: "es" } }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));
jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../services/referral", () => ({ getMyReferralInfo: jest.fn() }));
jest.mock("../../utils/momentShareImage", () => ({ createMomentShareImage: jest.fn() }));

import { getMyReferralInfo } from "../../services/referral";
import { trackEvent } from "../../utils/analytics";
import { createMomentShareImage } from "../../utils/momentShareImage";

const OWNER = { id: "u1", username: "jane" };
const renderDialog = (moment, props = {}) => render(
  <MomentShareDialog moment={moment} owner={OWNER} isOpen onClose={jest.fn()} onShareWholePassport={jest.fn()} {...props} />
);

describe("MomentShareDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL = jest.fn(() => "blob:moment");
    global.URL.revokeObjectURL = jest.fn();
    getMyReferralInfo.mockResolvedValue({ referralCode: "jane" });
    createMomentShareImage.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    delete navigator.canShare;
  });

  it("draws the card of the new country: its flag, its name and whose it is", async () => {
    renderDialog({ kind: "country", code: "IT", isPrivate: false });

    expect(await screen.findByRole("img")).toHaveAttribute("src", "blob:moment");
    expect(createMomentShareImage.mock.calls[0][0]).toMatchObject({
      symbol: "🇮🇹", name: "Italia", title: "passport.momentCountryTitle", username: "jane",
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("draws the card of a new badge with its emoji and name", async () => {
    renderDialog({ kind: "badge", code: "explorer", isPrivate: false });

    await screen.findByRole("img");
    expect(createMomentShareImage.mock.calls[0][0]).toMatchObject({ symbol: "🧭", name: "badges.explorer.name", title: "passport.momentBadgeTitle" });
  });

  // Only the owner sees it in their passport: sharing the image reveals it.
  it("warns before sharing a country only the owner can see", async () => {
    renderDialog({ kind: "country", code: "IT", isPrivate: true });

    expect(await screen.findByRole("status")).toHaveTextContent("passport.momentPrivateCountry");
  });

  it("links to the owner's passport with their referral code", async () => {
    renderDialog({ kind: "country", code: "IT", isPrivate: false });

    await waitFor(() => expect(screen.getByLabelText("passport.linkLabel")).toHaveValue(`${window.location.origin}/profile/u1/passport?ref=jane`));
  });

  it("lets the owner switch to sharing the whole passport", async () => {
    const onShareWholePassport = jest.fn();
    renderDialog({ kind: "country", code: "IT", isPrivate: false }, { onShareWholePassport });

    fireEvent.click(await screen.findByText("passport.momentFullPassport"));

    expect(onShareWholePassport).toHaveBeenCalled();
  });

  it("records the opening as a moment from a notification", async () => {
    renderDialog({ kind: "badge", code: "explorer", isPrivate: false });

    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith("passport_share_opened", { source: "notification", moment: "badge" }));
  });
});
