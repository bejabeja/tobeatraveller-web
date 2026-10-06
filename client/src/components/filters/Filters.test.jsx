import { act, fireEvent, render, screen } from "@testing-library/react";
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

  describe("trips by van", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const lastFilters = (onChange) => onChange.mock.calls.at(-1)[0];

    it("narrows the search to them and says it is on", () => {
      const onChange = jest.fn();
      render(<Filters onChange={onChange} />);

      fireEvent.click(screen.getByRole("button", { name: /tripByVan.label/ }));
      act(() => { jest.advanceTimersByTime(400); });

      expect(lastFilters(onChange).byVan).toBe("true");
      expect(screen.getByRole("button", { name: /tripByVan.label/ })).toHaveAttribute("aria-pressed", "true");
    });

    it("goes back to every trip when pressed again", () => {
      const onChange = jest.fn();
      render(<Filters onChange={onChange} defaultValues={{ byVan: "true" }} />);

      fireEvent.click(screen.getByRole("button", { name: /tripByVan.label/ }));
      act(() => { jest.advanceTimersByTime(400); });

      expect(lastFilters(onChange).byVan).toBe("");
    });

    it("keeps the category it was combined with", () => {
      const onChange = jest.fn();
      render(<Filters onChange={onChange} defaultValues={{ category: "adventure" }} />);

      fireEvent.click(screen.getByRole("button", { name: /tripByVan.label/ }));
      act(() => { jest.advanceTimersByTime(400); });

      expect(lastFilters(onChange)).toMatchObject({ byVan: "true", category: "adventure" });
    });
  });
});
