import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockDispatch = jest.fn();

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: () => true,
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key, i18n: { resolvedLanguage: "es" } }) }));
jest.mock("../../services/users", () => ({ checkUsernameAvailable: jest.fn().mockResolvedValue(true) }));
jest.mock("../../store/auth/authActions", () => ({
  createUser: jest.fn((user) => ({ type: "create", user })),
  setImageAuthLoaded: jest.fn(),
}));
jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../utils/preloadImg", () => ({ preloadImg: jest.fn() }));

import { createUser } from "../../store/auth/authActions";
import Signup from "./Signup";

const renderSignup = (path = "/register") => render(<MemoryRouter initialEntries={[path]}><Signup /></MemoryRouter>);

// Waits for the username check: the button stays disabled while it runs.
const fillAndSubmit = async () => {
  fireEvent.change(screen.getByLabelText("auth.emailLabel"), { target: { value: "ana@example.com" } });
  fireEvent.change(screen.getByLabelText("auth.usernameLabel"), { target: { value: "ana" } });
  fireEvent.change(screen.getByLabelText("auth.passwordLabel"), { target: { value: "secret1" } });
  fireEvent.change(screen.getByLabelText("auth.confirmPasswordLabel"), { target: { value: "secret1" } });
  screen.getAllByRole("checkbox").forEach((checkbox) => fireEvent.click(checkbox));
  await screen.findByText("auth.usernameAvailable", {}, { timeout: 2000 });
  fireEvent.click(screen.getByRole("button", { name: "auth.createAccount" }));
};

describe("Signup invite code", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fills in the code of the invite link it came from", () => {
    renderSignup("/register?ref=tbat");

    expect(screen.getByLabelText("referral.signupCodeLabel")).toHaveValue("tbat");
  });

  // Regression: on the web the code could only come from the link, so
  // someone who opened the site on their own lost the invitation.
  it("sends a code typed by hand", async () => {
    renderSignup();

    fireEvent.change(screen.getByLabelText("referral.signupCodeLabel"), { target: { value: " tbat " } });
    await fillAndSubmit();

    await waitFor(() => expect(createUser).toHaveBeenCalled());
    expect(createUser.mock.calls[0][0].referralCode).toBe("tbat");
  });

  it("signs up without a code when none is given", async () => {
    renderSignup();

    await fillAndSubmit();

    await waitFor(() => expect(createUser).toHaveBeenCalled());
    expect(createUser.mock.calls[0][0].referralCode).toBeUndefined();
  });
});
