import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-redux", () => ({ useDispatch: () => jest.fn(), useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("@tobeatraveller/shared", () => ({
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  getSuggestedUsers: jest.fn(),
  setUserInfo: jest.fn(),
  selectAuthUser: () => ({ id: "u1" }),
  generateAvatar: (username) => `avatar:${username}`,
}));

import { getSuggestedUsers } from "@tobeatraveller/shared";
import Onboarding from "./Onboarding";

const renderOnboarding = () => render(<MemoryRouter><Onboarding /></MemoryRouter>);

describe("Onboarding with nobody to follow yet", () => {
  // Regression: it said there were no suggestions and left nothing to do,
  // with the progress dots still asking to follow people.
  it("offers first steps of their own instead", async () => {
    getSuggestedUsers.mockResolvedValue([]);

    renderOnboarding();

    expect(await screen.findByRole("link", { name: /onboarding.startTrip/ })).toHaveAttribute("href", "/create-itinerary");
    expect(screen.getByRole("link", { name: /onboarding.startPassport/ })).toHaveAttribute("href", "/profile/u1/passport");
    expect(screen.getByRole("link", { name: /onboarding.startProfile/ })).toHaveAttribute("href", "/profile/edit/u1");
    expect(screen.queryByText("onboarding.readyToGo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "onboarding.skip" })).not.toBeInTheDocument();
  });

  // Regression: a failed request left the page loading forever.
  it("stops loading when the suggestions can't be fetched", async () => {
    getSuggestedUsers.mockRejectedValue(new Error("Network error"));

    renderOnboarding();

    expect(await screen.findByRole("link", { name: /onboarding.startTrip/ })).toBeInTheDocument();
  });
});

it("asks to follow someone when there are suggestions", async () => {
  getSuggestedUsers.mockResolvedValue([{ id: "u2", username: "ana", totalItineraries: 1 }]);

  renderOnboarding();

  expect(await screen.findByText("onboarding.followPrompt")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /onboarding.startTrip/ })).not.toBeInTheDocument();
});
