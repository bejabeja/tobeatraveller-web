import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let mockAuthenticated;

jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: "es", changeLanguage: jest.fn() } }) }));
jest.mock("../../store/auth/authSelectors", () => ({ selectIsAuthenticated: () => mockAuthenticated }));
jest.mock("../../store/user/userInfoSelectors", () => ({ selectMe: () => (mockAuthenticated ? { id: "u1", username: "tbat" } : null) }));
jest.mock("@tobeatraveller/shared", () => ({
  ...jest.requireActual("../../../../shared/src/utils/constants/languages.js"),
  selectUnreadCount: () => 0,
  generateAvatar: (username) => `avatar:${username}`,
}));

import Navbar from "./Navbar";

const renderNavbar = () => render(<MemoryRouter initialEntries={["/explore"]}><Navbar onOpenSearch={jest.fn()} /></MemoryRouter>);

describe("Navbar signed out on a phone", () => {
  beforeEach(() => { mockAuthenticated = false; });

  // Regression: there was no way to sign up but the URL, and the bottom bar
  // gave the plans a tab while Community had none.
  it("offers to create an account and takes the bottom bar to Community", () => {
    const { container } = renderNavbar();

    expect(within(container.querySelector(".mobile-header")).getByRole("link", { name: "nav.signUpShort" }))
      .toHaveAttribute("href", "/register");
    const bottom = within(container.querySelector(".bottom-nav"));
    expect(bottom.getByRole("link", { name: /community.title/ })).toHaveAttribute("href", "/community");
    expect(bottom.queryByRole("link", { name: /nav.subscription/ })).not.toBeInTheDocument();
  });
});

describe("Navbar signed in", () => {
  beforeEach(() => { mockAuthenticated = true; });

  it("offers no account creation", () => {
    renderNavbar();

    expect(screen.queryByRole("link", { name: "nav.signUpShort" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "nav.createAccountBtn" })).not.toBeInTheDocument();
  });
});
