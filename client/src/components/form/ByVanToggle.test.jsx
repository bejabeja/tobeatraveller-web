import { render, screen } from "@testing-library/react";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

import ByVanToggle from "./ByVanToggle";

describe("ByVanToggle", () => {
  it("promises to be found in Explore when the trip is public", () => {
    render(<ByVanToggle checked onChange={jest.fn()} isPublic />);

    expect(screen.getByText("tripByVan.hint")).toBeInTheDocument();
  });

  // Regression: a private trip said anyone looking for van trips would find it in Explore.
  it("says Explore only lists public trips when the trip is private", () => {
    render(<ByVanToggle checked onChange={jest.fn()} isPublic={false} />);

    expect(screen.getByText("tripByVan.hintPrivate")).toBeInTheDocument();
    expect(screen.queryByText("tripByVan.hint")).not.toBeInTheDocument();
  });
});
