import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const mockDispatch = jest.fn();

jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${vars.count}` : key) }) }));
jest.mock("@tobeatraveller/shared", () => ({
  ...jest.requireActual("@tobeatraveller/shared/src/utils/travelStyle.js"),
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  getSuggestedUsers: jest.fn(),
  updateMyTravelStyle: jest.fn(),
  setUserInfo: (id) => ({ type: "setUserInfo", id }),
  selectAuthUser: () => ({ id: "u1" }),
  generateAvatar: (username) => `avatar:${username}`,
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../utils/analyticsEvents", () => ({
  ANALYTICS_EVENTS: {
    ONBOARDING_START_STEP_CLICKED: "onboarding_start_step_clicked",
    ONBOARDING_TRAVEL_STYLE_CHOSEN: "onboarding_travel_style_chosen",
    USER_FOLLOWED: "user_followed",
  },
}));

import toast from "react-hot-toast";
import { getSuggestedUsers, updateMyTravelStyle } from "@tobeatraveller/shared";
import { trackEvent } from "../../utils/analytics";
import Onboarding from "./Onboarding";

const ANA = { id: "u2", username: "ana", totalItineraries: 1 };

const VanLogProbe = () => <p>{useLocation().state?.quickAdd ? "van log opens the form" : "van log"}</p>;

const renderOnboarding = () => render(
  <MemoryRouter initialEntries={["/welcome"]}>
    <Routes>
      <Route path="/welcome" element={<Onboarding />} />
      <Route path="/" element={<p>the app</p>} />
      <Route path="/van-log" element={<VanLogProbe />} />
    </Routes>
  </MemoryRouter>,
);

const choose = async (style) => {
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(`^travelStyle\\.${style} `) }));
};

describe("Onboarding: how do you travel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSuggestedUsers.mockResolvedValue([]);
    updateMyTravelStyle.mockResolvedValue(undefined);
  });

  it("asks first how they travel, with both answers and a way to skip", async () => {
    renderOnboarding();

    expect(await screen.findByText("travelStyle.question")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^travelStyle\.van / })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^travelStyle\.occasional / })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "onboarding.skip" })).toBeInTheDocument();
  });

  it("starts someone in a van with their expenses, their supplies and the list before driving off", async () => {
    renderOnboarding();

    await choose("van");

    expect(await screen.findByRole("link", { name: /onboarding.startExpense/ })).toHaveAttribute("href", "/van-log");
    expect(screen.getByRole("link", { name: /onboarding.startSupplies/ })).toHaveAttribute("href", "/supplies");
    expect(screen.getByRole("link", { name: /onboarding.startChecklist/ })).toHaveAttribute("href", "/packing-checklist");
    expect(screen.queryByRole("link", { name: /onboarding.startTrip/ })).not.toBeInTheDocument();
  });

  // Regression: "record your first expense" landed on an empty list and the person had to press add again.
  it("sends the first expense step to Expenses with the form already open", async () => {
    renderOnboarding();
    await choose("van");

    fireEvent.click(await screen.findByRole("link", { name: /onboarding.startExpense/ }));

    expect(await screen.findByText("van log opens the form")).toBeInTheDocument();
  });

  it("starts someone who travels now and then with a trip, a packing list and their countries", async () => {
    renderOnboarding();

    await choose("occasional");

    expect(await screen.findByRole("link", { name: /onboarding.startTrip/ })).toHaveAttribute("href", "/create-itinerary");
    expect(screen.getByRole("link", { name: /onboarding.startPassport/ })).toHaveAttribute("href", "/profile/u1/passport");
    expect(screen.getByRole("link", { name: /onboarding.startPackingList/ })).toHaveAttribute("href", "/packing-checklist");
    expect(screen.queryByRole("link", { name: /onboarding.startExpense/ })).not.toBeInTheDocument();
  });

  it("saves the answer, counts it and refreshes the profile", async () => {
    renderOnboarding();

    await choose("van");

    await waitFor(() => expect(updateMyTravelStyle).toHaveBeenCalledWith("van"));
    expect(trackEvent).toHaveBeenCalledWith("onboarding_travel_style_chosen", { style: "van" });
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: "setUserInfo", id: "u1" }));
  });

  // Regression-in-waiting: an optional preference that fails to save must never keep someone out of the app.
  it("carries on with the first steps when the answer cannot be saved", async () => {
    updateMyTravelStyle.mockRejectedValue(new Error("Network error"));
    renderOnboarding();

    await choose("van");

    expect(await screen.findByRole("link", { name: /onboarding.startExpense/ })).toBeInTheDocument();
  });

  it("tells them it was not saved and where to set it, instead of failing silently", async () => {
    updateMyTravelStyle.mockRejectedValue(new Error("Network error"));
    renderOnboarding();

    await choose("van");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("onboarding.travelStyleSaveError"));
  });

  it("gives the general first steps, and saves nothing, to whoever skips the question", async () => {
    renderOnboarding();

    fireEvent.click(await screen.findByRole("button", { name: "onboarding.skip" }));

    expect(await screen.findByRole("link", { name: /onboarding.startTrip/ })).toBeInTheDocument();
    expect(updateMyTravelStyle).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalledWith("onboarding_travel_style_chosen", expect.anything());
  });

  // Regression-in-waiting: the pressed button disappeared with its step and the focus was lost.
  it("moves the focus to the heading of each step, so keyboard and screen reader users know it changed", async () => {
    renderOnboarding();
    expect(await screen.findByText("travelStyle.question")).toHaveFocus();

    await choose("van");

    expect(await screen.findByText("onboarding.startTitle")).toHaveFocus();
  });

  it("counts which first step they chose", async () => {
    renderOnboarding();
    await choose("van");

    fireEvent.click(await screen.findByRole("link", { name: /onboarding.startSupplies/ }));

    expect(trackEvent).toHaveBeenCalledWith("onboarding_start_step_clicked", { step: "startSupplies" });
  });
});

describe("Onboarding: after the first steps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateMyTravelStyle.mockResolvedValue(undefined);
  });

  const reachFirstSteps = async () => {
    renderOnboarding();
    await choose("occasional");
    await screen.findByRole("link", { name: /onboarding.startTrip/ });
  };

  it("moves the focus to the progress of the last step, once it is shown", async () => {
    getSuggestedUsers.mockResolvedValue([ANA]);
    await reachFirstSteps();
    await waitFor(() => expect(screen.getByRole("button", { name: "onboarding.skip" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "onboarding.skip" }));

    expect(await screen.findByText("onboarding.followPrompt")).toHaveFocus();
  });

  it("goes into the app when there is nobody to follow", async () => {
    getSuggestedUsers.mockResolvedValue([]);
    await reachFirstSteps();

    fireEvent.click(screen.getByRole("button", { name: "onboarding.skip" }));

    expect(await screen.findByText("the app")).toBeInTheDocument();
  });

  it("offers to follow someone when there is, as the last step", async () => {
    getSuggestedUsers.mockResolvedValue([ANA]);
    await reachFirstSteps();
    await waitFor(() => expect(screen.getByRole("button", { name: "onboarding.skip" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "onboarding.skip" }));

    expect(await screen.findByText("onboarding.followPrompt")).toBeInTheDocument();
    expect(screen.getByText("@ana")).toBeInTheDocument();
  });

  // Regression: it asked to follow at least one traveller before it let anyone continue.
  it("lets them continue without following anyone", async () => {
    getSuggestedUsers.mockResolvedValue([ANA]);
    await reachFirstSteps();
    await waitFor(() => expect(screen.getByRole("button", { name: "onboarding.skip" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "onboarding.skip" }));

    const cont = await screen.findByRole("button", { name: "onboarding.continue" });
    expect(cont).toBeEnabled();
    fireEvent.click(cont);

    expect(await screen.findByText("the app")).toBeInTheDocument();
  });

  it("waits for the suggestions before deciding whether there is anyone to follow", async () => {
    getSuggestedUsers.mockReturnValue(new Promise(() => {}));
    await reachFirstSteps();

    expect(screen.getByRole("button", { name: "onboarding.skip" })).toBeDisabled();
  });

  // Regression: a failed request left the page loading forever.
  it("goes on when the suggestions cannot be fetched", async () => {
    getSuggestedUsers.mockRejectedValue(new Error("Network error"));
    await reachFirstSteps();
    await waitFor(() => expect(screen.getByRole("button", { name: "onboarding.skip" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "onboarding.skip" }));

    expect(await screen.findByText("the app")).toBeInTheDocument();
  });
});
