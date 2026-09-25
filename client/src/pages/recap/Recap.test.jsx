import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Recap from "./Recap.jsx";

const mockT = (key, vars) => (vars?.count != null ? `${key}:${vars.count}` : key);
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT, i18n: { language: "es" } }),
}));

jest.mock("react-redux", () => ({
  useSelector: () => ({ id: "user-1", username: "jane" }),
}));

jest.mock("react-hot-toast", () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));
jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../services/recap", () => ({ getMyRecap: jest.fn() }));
jest.mock("../../services/referral", () => ({ getMyReferralInfo: jest.fn() }));
jest.mock("../../utils/recapShareImage", () => ({ createRecapShareImage: jest.fn() }));

import { getMyRecap } from "../../services/recap";
import { getMyReferralInfo } from "../../services/referral";
import { trackEvent } from "../../utils/analytics";
import { createRecapShareImage } from "../../utils/recapShareImage";

const RECAP = {
  available: true,
  year: 2026,
  hasActivity: true,
  countries: { codes: ["PT", "ES"], newCodes: ["PT"], privateCodes: [], top: { code: "PT", days: 20 } },
  daysOnRoad: 87,
  trips: { count: 0, longest: null },
  vanLog: { entries: 40, nights: 25, refuels: 9, liters: 413 },
  diary: { entries: 0, wouldReturn: 0 },
  badges: [],
};

const renderRecap = (path = "/recap?from=notification", initialEntries = [path]) => render(
  <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
    <Routes>
      <Route path="/recap" element={<Recap />} />
      <Route path="/profile/:id/passport" element={<p>passport page</p>} />
      <Route path="/notifications" element={<p>notifications page</p>} />
    </Routes>
  </MemoryRouter>
);

describe("Recap page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL = jest.fn(() => "blob:recap");
    global.URL.revokeObjectURL = jest.fn();
    getMyReferralInfo.mockResolvedValue({ referralCode: "jane" });
    createRecapShareImage.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    getMyRecap.mockResolvedValue(RECAP);
  });

  it("goes through the year one slide at a time, only those with something in them", async () => {
    renderRecap();

    expect(await screen.findByText("recap.title")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("recap.next"));
    expect(screen.getByText("recap.countriesTitle:2")).toBeInTheDocument();
    expect(screen.getByText("recap.countriesNew:1")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("recap.daysTitle:87")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowRight" });
    // No trips, diary or badges this year: straight to the van.
    expect(screen.getByText("recap.vanTitle")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("recap.daysTitle:87")).toBeInTheDocument();
  });

  const currentFill = (container) => container.querySelector(".recap__progress-fill--current");

  it("fills the current slide's bar over its duration and then moves on by itself", async () => {
    const { container } = renderRecap();
    await screen.findByText("recap.title");

    expect(currentFill(container)).toHaveStyle({ animationDuration: "5000ms" });
    fireEvent.animationEnd(currentFill(container));

    expect(screen.getByText("recap.countriesTitle:2")).toBeInTheDocument();
    expect(container.querySelectorAll(".recap__progress-fill--done")).toHaveLength(1);
  });

  // Like other stories: hold to read, a short tap to move on.
  it("pauses while a side of the screen is held, and a hold doesn't move on", async () => {
    const now = jest.spyOn(Date, "now");
    const { container } = renderRecap();
    await screen.findByText("recap.title");
    const nextZone = screen.getByLabelText("recap.next");

    now.mockReturnValue(1000);
    fireEvent.pointerDown(nextZone);
    expect(currentFill(container)).toHaveClass("recap__progress-fill--paused");
    now.mockReturnValue(2000);
    fireEvent.pointerUp(nextZone);
    fireEvent.click(nextZone);

    expect(currentFill(container)).not.toHaveClass("recap__progress-fill--paused");
    expect(screen.getByText("recap.title")).toBeInTheDocument();
    now.mockRestore();
  });

  it("moves on with a short tap", async () => {
    const now = jest.spyOn(Date, "now");
    renderRecap();
    await screen.findByText("recap.title");
    const nextZone = screen.getByLabelText("recap.next");

    now.mockReturnValue(1000);
    fireEvent.pointerDown(nextZone);
    now.mockReturnValue(1100);
    fireEvent.pointerUp(nextZone);
    fireEvent.click(nextZone);

    expect(screen.getByText("recap.countriesTitle:2")).toBeInTheDocument();
    now.mockRestore();
  });

  it("pauses and resumes with the space bar", async () => {
    const { container } = renderRecap();
    await screen.findByText("recap.title");

    fireEvent.keyDown(document, { key: " " });
    expect(currentFill(container)).toHaveClass("recap__progress-fill--paused");
    fireEvent.keyDown(document, { key: " " });
    expect(currentFill(container)).not.toHaveClass("recap__progress-fill--paused");
  });

  it("pauses while the tab is hidden", async () => {
    const { container } = renderRecap();
    await screen.findByText("recap.title");
    const hidden = jest.spyOn(document, "hidden", "get").mockReturnValue(true);

    fireEvent(document, new Event("visibilitychange"));
    expect(currentFill(container)).toHaveClass("recap__progress-fill--paused");

    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    expect(currentFill(container)).not.toHaveClass("recap__progress-fill--paused");
    hidden.mockRestore();
  });

  it("does not move on by itself from the share slide", async () => {
    const { container } = renderRecap();
    await screen.findByText("recap.title");

    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(document, { key: "ArrowRight" });

    expect(await screen.findByText("recap.shareTitle")).toBeInTheDocument();
    expect(currentFill(container)).toBeNull();
  });

  it("ends with the image to share, built from the recap", async () => {
    renderRecap();
    await screen.findByText("recap.title");

    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(document, { key: "ArrowRight" });

    expect(await screen.findByRole("img", { name: "recap.shareTitle" })).toHaveAttribute("src", "blob:recap");
    expect(createRecapShareImage.mock.calls[0][0].summary).toMatchObject({ username: "jane", year: 2026, countryCount: 2 });
    expect(screen.getByText("passport.downloadImage")).toBeInTheDocument();
  });

  // As on the passport image: countries only the owner sees go out only if
  // they choose so, knowing what it reveals.
  describe("with countries only the owner sees", () => {
    const goToShareSlide = async () => {
      renderRecap();
      await screen.findByText("recap.title");
      for (let step = 0; step < 4; step += 1) fireEvent.keyDown(document, { key: "ArrowRight" });
      await screen.findByRole("img", { name: "recap.shareTitle" });
    };

    beforeEach(() => {
      getMyRecap.mockResolvedValue({ ...RECAP, countries: { ...RECAP.countries, codes: ["PT", "ES", "FR"], privateCodes: ["FR"] } });
    });

    it("leaves them out of the image by default", async () => {
      await goToShareSlide();

      expect(createRecapShareImage.mock.calls[0][0].summary).toMatchObject({ countryCount: 2, flagCodes: ["PT", "ES"] });
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("adds them when the owner chooses to, saying what that reveals", async () => {
      await goToShareSlide();

      fireEvent.click(screen.getByLabelText("passport.shareIncludePrivate"));

      await waitFor(() => expect(createRecapShareImage.mock.calls.at(-1)[0].summary).toMatchObject({ countryCount: 3 }));
      expect(screen.getByRole("status")).toHaveTextContent("recap.shareIncludesPrivate");
    });
  });

  it("offers no choice when every country of the year is public", async () => {
    renderRecap();
    await screen.findByText("recap.title");
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(document, { key: "ArrowRight" });
    await screen.findByRole("img", { name: "recap.shareTitle" });

    expect(screen.queryByLabelText("passport.shareIncludePrivate")).not.toBeInTheDocument();
  });

  it("records the opening and where it came from", async () => {
    renderRecap();

    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith("recap_opened", { has_activity: true, source: "notification" }));
  });

  it("says so for a year with nothing logged, without a bar filling to nowhere", async () => {
    getMyRecap.mockResolvedValue({ ...RECAP, hasActivity: false });

    const { container } = renderRecap();

    expect(await screen.findByText("recap.empty")).toBeInTheDocument();
    expect(container.querySelector(".recap__progress-fill--current")).toBeNull();
  });

  it("says when the recap will be available out of season", async () => {
    getMyRecap.mockResolvedValue({ available: false });

    renderRecap();

    expect(await screen.findByText("recap.notAvailable")).toBeInTheDocument();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("goes back to where it was opened from when closed", async () => {
    renderRecap("/recap?from=notification", ["/notifications", "/recap?from=notification"]);
    await screen.findByText("recap.title");

    fireEvent.click(screen.getByLabelText("recap.close"));

    expect(await screen.findByText("notifications page")).toBeInTheDocument();
  });

  // Opened straight from a link: there's nothing to go back to in the app.
  it("goes to the owner's passport when closed with nothing to go back to", async () => {
    renderRecap();
    await screen.findByText("recap.title");

    fireEvent.click(screen.getByLabelText("recap.close"));

    expect(await screen.findByText("passport page")).toBeInTheDocument();
  });

  it("shows an error when the recap cannot be loaded", async () => {
    getMyRecap.mockRejectedValue(new Error("offline"));

    renderRecap();

    expect(await screen.findByText("recap.loadError")).toBeInTheDocument();
  });
});
