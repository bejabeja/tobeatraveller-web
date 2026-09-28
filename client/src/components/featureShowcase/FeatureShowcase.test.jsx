import { fireEvent, render, screen } from "@testing-library/react";

let mockLanguage = "es";
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: mockLanguage } }),
}));

import FeatureShowcase from "./FeatureShowcase";

beforeEach(() => { mockLanguage = "es"; });

// Regression: every visitor saw the same English screenshots.
it("shows the screenshot in the visitor's language", () => {
  render(<FeatureShowcase />);

  expect(screen.getByRole("img")).toHaveAttribute("src", "/images/showcase/es/aiItineraries.webp");
});

it("falls back to the English screenshots for a language the app doesn't have", () => {
  mockLanguage = "pt-BR";
  render(<FeatureShowcase />);

  expect(screen.getByRole("img").getAttribute("src")).toMatch(/^\/images\/showcase\/en\//);
});

it("shows the feature's emoji when its screenshot is missing, and still tries the next one", () => {
  render(<FeatureShowcase />);

  fireEvent.error(screen.getByRole("img"));
  expect(screen.queryByRole("img")).not.toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("tab")[1]);
  expect(screen.getByRole("img")).toBeInTheDocument();
});
