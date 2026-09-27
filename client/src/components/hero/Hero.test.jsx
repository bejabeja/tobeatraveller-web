import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-redux", () => ({ useDispatch: () => jest.fn(), useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, vars) => `${key}:${vars?.username ?? ""}` }) }));
jest.mock("../../store/auth/authActions", () => ({ setImageHeroLoaded: jest.fn() }));
jest.mock("../../store/auth/authSelectors", () => ({
  selectAuthUser: () => ({ id: "u1", username: "tbat" }),
  selectIsAuthenticated: () => true,
  selectimageHeroLoaded: () => true,
}));
jest.mock("../../store/user/userInfoSelectors", () => ({ selectMe: () => null }));
jest.mock("../../utils/preloadImg", () => ({ preloadImg: jest.fn() }));

import Hero from "./Hero";

// Regression: until the full profile arrived the greeting read "Hello, !".
it("greets by name before the full profile has loaded", () => {
  render(<MemoryRouter><Hero /></MemoryRouter>);

  expect(screen.getByRole("heading")).toHaveTextContent("home.heroGreeting:tbat");
});
