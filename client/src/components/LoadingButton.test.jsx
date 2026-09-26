import { render, screen } from "@testing-library/react";
import LoadingButton from "./LoadingButton";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

describe("LoadingButton", () => {
  // Regression: it said "Loading" in English whatever the app's language.
  it("says it is loading in the app's language, and can't be pressed again", () => {
    render(<LoadingButton isLoading>common.loadMore</LoadingButton>);

    const button = screen.getByRole("button", { name: "common.loading" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("shows its label when not loading", () => {
    render(<LoadingButton isLoading={false}>common.loadMore</LoadingButton>);

    expect(screen.getByRole("button", { name: "common.loadMore" })).toBeEnabled();
  });
});
