import { render, screen } from "@testing-library/react";
import PassportMap from "./PassportMap.jsx";

const mockT = (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key);
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));

const passport = (overrides) => ({ countries: [], declaredCountries: [], ...overrides });
const shapeOf = (container, code) => container.querySelector(`[data-country="${code}"]`);

describe("PassportMap", () => {
  it("paints the visited countries, and says how many for screen readers", () => {
    const { container } = render(<PassportMap passport={passport({ countries: [{ code: "ES", isPrivate: false }, { code: "PT", isPrivate: false }] })} />);

    expect(screen.getByRole("img", { name: 'passport.mapLabel:{"count":2}' })).toBeInTheDocument();
    expect(shapeOf(container, "ES")).toHaveClass("passport-map__country--visited");
    expect(shapeOf(container, "IT")).not.toHaveClass("passport-map__country--visited");
  });

  it("tells apart the countries only the owner sees and the ones marked by hand", () => {
    const { container } = render(<PassportMap passport={passport({
      countries: [{ code: "FR", isPrivate: true }],
      declaredCountries: [{ code: "JP" }],
    })} />);

    expect(shapeOf(container, "FR")).toHaveClass("passport-map__country--private");
    expect(shapeOf(container, "JP")).toHaveClass("passport-map__country--declared");
  });

  it("shows in the legend only the kinds of countries on the map", () => {
    render(<PassportMap passport={passport({ countries: [{ code: "ES", isPrivate: false }] })} />);

    expect(screen.getByText("passport.mapVisited")).toBeInTheDocument();
    expect(screen.queryByText("passport.mapPrivate")).not.toBeInTheDocument();
    expect(screen.queryByText("passport.mapDeclared")).not.toBeInTheDocument();
  });

  it("marks a visited tiny country with a dot", () => {
    const { container } = render(<PassportMap passport={passport({ countries: [{ code: "AD", isPrivate: false }] })} />);

    expect(container.querySelector('circle[data-country="AD"]')).toBeInTheDocument();
  });

  it("shows no legend on an empty map", () => {
    render(<PassportMap passport={passport()} />);

    expect(screen.queryByText("passport.mapVisited")).not.toBeInTheDocument();
  });
});
