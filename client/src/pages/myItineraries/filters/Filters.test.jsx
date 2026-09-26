import { fireEvent, render, screen } from "@testing-library/react";
import Filters from "./Filters";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

describe("Filters", () => {
  // On a phone the toggle shows only its icon: its name has to come from
  // the label, for screen readers.
  it("names the filters toggle and opens the advanced filters", () => {
    render(<Filters onChange={jest.fn()} />);

    const toggle = screen.getByRole("button", { name: "explore.filters" });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("names the categories in the app language", () => {
    render(<Filters onChange={jest.fn()} />);

    expect(screen.getByRole("button", { name: /tripCategories.adventure/ })).toBeInTheDocument();
  });
});
