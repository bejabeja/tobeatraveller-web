import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-redux", () => ({
  useSelector: () => true,
  useDispatch: () => jest.fn(),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, vars) => (key === "auth.resetLinkSent" ? `If an account exists for <strong>${vars.email}</strong>, a link is on its way.` : key),
  }),
}));
jest.mock("../../hooks/usePageMeta", () => ({ usePageMeta: jest.fn() }));
jest.mock("../../store/auth/authActions", () => ({ setImageAuthLoaded: () => ({ type: "imageAuthLoaded" }) }));
jest.mock("../../store/auth/authSelectors", () => ({ selectimageAuthLoaded: () => true }));
jest.mock("@tobeatraveller/shared", () => ({
  ...jest.requireActual("../../../../shared/src/utils/parseRichText.js"),
  ...jest.requireActual("../../../../shared/src/utils/schemasValidation.js"),
  forgotPassword: jest.fn(),
  translateAuthError: (t, message) => message,
}));

import { forgotPassword } from "@tobeatraveller/shared";
import ForgotPassword from "./ForgotPassword";

describe("ForgotPassword", () => {
  beforeEach(() => {
    forgotPassword.mockReset().mockResolvedValue({});
  });

  // The notice is a translation with markup in it and the address typed in the form: the
  // address goes in as text, never as markup.
  it("says where the link was sent, with the address in bold as text", async () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    await userEvent.type(screen.getByRole("textbox"), "jane@example.com{Enter}");

    const address = await screen.findByText("jane@example.com");
    expect(address.tagName).toBe("STRONG");
    expect(forgotPassword).toHaveBeenCalledWith("jane@example.com");
  });
});
