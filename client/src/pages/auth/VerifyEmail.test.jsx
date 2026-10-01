import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

let mockAuthUser = null;
const mockDispatch = jest.fn();

jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => mockDispatch,
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("../../hooks/usePageMeta", () => ({ usePageMeta: jest.fn() }));
jest.mock("@tobeatraveller/shared", () => ({
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn(),
  selectAuthUser: () => mockAuthUser,
  setUserInfo: (id) => ({ type: "setUserInfo", id }),
}));

import { resendVerificationEmail, verifyEmail } from "@tobeatraveller/shared";
import VerifyEmail from "./VerifyEmail";

const TOKEN = "a".repeat(64);
const renderAt = (url) => render(<MemoryRouter initialEntries={[url]}><VerifyEmail /></MemoryRouter>);

describe("VerifyEmail", () => {
  beforeEach(() => {
    mockAuthUser = null;
    mockDispatch.mockClear();
    verifyEmail.mockReset().mockResolvedValue({ message: "Email confirmed" });
    resendVerificationEmail.mockReset().mockResolvedValue({ alreadyVerified: false });
  });

  it("confirms the email with the token in the link, once", async () => {
    renderAt(`/verify-email?token=${TOKEN}`);

    expect(await screen.findByText("emailVerification.successTitle")).toBeInTheDocument();
    expect(verifyEmail).toHaveBeenCalledTimes(1);
    expect(verifyEmail).toHaveBeenCalledWith(TOKEN);
  });

  it("says it is confirming while it waits", () => {
    verifyEmail.mockReturnValue(new Promise(() => {}));
    renderAt(`/verify-email?token=${TOKEN}`);

    expect(screen.getByText("emailVerification.verifying")).toBeInTheDocument();
  });

  it("sends someone who is not signed in to sign in once it is confirmed", async () => {
    renderAt(`/verify-email?token=${TOKEN}`);

    expect(await screen.findByRole("link", { name: "auth.signIn" })).toHaveAttribute("href", "/login");
  });

  it("sends someone who is signed in home, and refreshes their profile so the notice goes away", async () => {
    mockAuthUser = { id: "user-1" };
    renderAt(`/verify-email?token=${TOKEN}`);

    expect(await screen.findByRole("link", { name: "errors.backHome" })).toHaveAttribute("href", "/");
    expect(mockDispatch).toHaveBeenCalledWith({ type: "setUserInfo", id: "user-1" });
  });

  // Regression-in-waiting: an opened link with nothing after it must not look like a failed try.
  it("says the link does not work, without calling the server, when there is no token", () => {
    renderAt("/verify-email");

    expect(screen.getByText("emailVerification.errorTitle")).toBeInTheDocument();
    expect(verifyEmail).not.toHaveBeenCalled();
  });

  it("says the link does not work when it has expired or been used", async () => {
    verifyEmail.mockRejectedValue(Object.assign(new Error("Invalid or expired token"), { status: 404 }));
    renderAt(`/verify-email?token=${TOKEN}`);

    expect(await screen.findByText("emailVerification.errorTitle")).toBeInTheDocument();
    expect(screen.getByText("emailVerification.errorDesc")).toBeInTheDocument();
  });

  it("offers a new link to someone who is signed in, and says it was sent", async () => {
    mockAuthUser = { id: "user-1" };
    verifyEmail.mockRejectedValue(new Error("expired"));
    renderAt(`/verify-email?token=${TOKEN}`);

    await userEvent.click(await screen.findByRole("button", { name: "emailVerification.resend" }));

    await waitFor(() => expect(resendVerificationEmail).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("emailVerification.bannerSent")).toBeInTheDocument();
  });

  it("asks someone who is not signed in to sign in to get a new link, instead of offering one it cannot send", async () => {
    verifyEmail.mockRejectedValue(new Error("expired"));
    renderAt(`/verify-email?token=${TOKEN}`);

    expect(await screen.findByText("emailVerification.errorSignedOut")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "emailVerification.resend" })).not.toBeInTheDocument();
  });

  it("tells them to wait when they asked for too many links", async () => {
    mockAuthUser = { id: "user-1" };
    verifyEmail.mockRejectedValue(new Error("expired"));
    resendVerificationEmail.mockRejectedValue(Object.assign(new Error("Too many"), { status: 429 }));
    renderAt(`/verify-email?token=${TOKEN}`);

    await userEvent.click(await screen.findByRole("button", { name: "emailVerification.resend" }));

    expect(await screen.findByText("emailVerification.tooMany")).toBeInTheDocument();
  });
});
