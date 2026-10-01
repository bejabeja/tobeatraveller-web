import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

let mockIsAuthenticated = true;
let mockMe = { id: "user-1", email: "ana@example.com", emailVerified: false };

jest.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
jest.mock("../../store/auth/authSelectors", () => ({ selectIsAuthenticated: () => mockIsAuthenticated }));
jest.mock("../../store/user/userInfoSelectors", () => ({ selectMe: () => mockMe }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${vars.email}` : key) }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock("@tobeatraveller/shared", () => ({ resendVerificationEmail: jest.fn() }));

import toast from "react-hot-toast";
import { resendVerificationEmail } from "@tobeatraveller/shared";
import EmailVerificationBanner from "./EmailVerificationBanner";

const renderAt = (path = "/") => render(<MemoryRouter initialEntries={[path]}><EmailVerificationBanner /></MemoryRouter>);

describe("EmailVerificationBanner", () => {
  beforeEach(() => {
    mockIsAuthenticated = true;
    mockMe = { id: "user-1", email: "ana@example.com", emailVerified: false };
    resendVerificationEmail.mockReset().mockResolvedValue({ alreadyVerified: false });
    toast.error.mockClear();
  });

  it("tells whoever has not confirmed which address the link went to", () => {
    renderAt();

    expect(screen.getByText("emailVerification.bannerText:ana@example.com")).toBeInTheDocument();
  });

  it("shows nothing to someone who has confirmed", () => {
    mockMe = { ...mockMe, emailVerified: true };
    renderAt();

    expect(screen.queryByText(/emailVerification.bannerText/)).not.toBeInTheDocument();
  });

  // Regression-in-waiting: before the profile arrives the state is unknown, and a notice that blinks away is worse than none.
  it("shows nothing while it is not known yet, or to someone who is signed out", () => {
    mockMe = { id: "user-1", email: "ana@example.com" };
    const { unmount } = renderAt();
    expect(screen.queryByText(/emailVerification.bannerText/)).not.toBeInTheDocument();
    unmount();

    mockMe = { id: "user-1", email: "ana@example.com", emailVerified: false };
    mockIsAuthenticated = false;
    renderAt();
    expect(screen.queryByText(/emailVerification.bannerText/)).not.toBeInTheDocument();
  });

  it("stays out of the way on the page that confirms the email", () => {
    renderAt("/verify-email");

    expect(screen.queryByText(/emailVerification.bannerText/)).not.toBeInTheDocument();
  });

  it("sends the link again and says so", async () => {
    renderAt();

    await userEvent.click(screen.getByRole("button", { name: "emailVerification.bannerSend" }));

    await waitFor(() => expect(resendVerificationEmail).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("emailVerification.bannerSent")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("says they asked for too many links when the limit is reached", async () => {
    resendVerificationEmail.mockRejectedValue(Object.assign(new Error("Too many"), { status: 429 }));
    renderAt();

    await userEvent.click(screen.getByRole("button", { name: "emailVerification.bannerSend" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("emailVerification.tooMany"));
    expect(screen.getByRole("button", { name: "emailVerification.bannerSend" })).toBeEnabled();
  });

  it("says it could not send it on any other failure, and lets them try again", async () => {
    resendVerificationEmail.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));
    renderAt();

    await userEvent.click(screen.getByRole("button", { name: "emailVerification.bannerSend" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("emailVerification.sendFailed"));
    expect(screen.getByRole("button", { name: "emailVerification.bannerSend" })).toBeEnabled();
  });
});
