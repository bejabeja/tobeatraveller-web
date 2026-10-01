import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("../../hooks/usePageMeta", () => ({ usePageMeta: jest.fn() }));

import { usePageMeta } from "../../hooks/usePageMeta";
import NotFound from "./NotFound";

const renderPage = (props) => render(<MemoryRouter><NotFound {...props} /></MemoryRouter>);

describe("NotFound", () => {
  // Regression: it was the red "Something went wrong" error box, as if the visitor had broken something.
  it("says the page does not exist, without presenting it as an error", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "errors.pageNotFoundTitle" })).toBeInTheDocument();
    expect(screen.getByText("errors.pageNotFound")).toBeInTheDocument();
    expect(screen.queryByText("errors.title")).not.toBeInTheDocument();
  });

  it("offers a way on: explore the trips or go back home", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "nav.explore" })).toHaveAttribute("href", "/explore");
    expect(screen.getByRole("link", { name: "errors.backHome" })).toHaveAttribute("href", "/");
  });

  it("shows the message it is given, such as a profile that does not exist", () => {
    renderPage({ message: "errors.profileNotFound" });

    expect(screen.getByText("errors.profileNotFound")).toBeInTheDocument();
  });

  it("gives the tab its own title", () => {
    renderPage();

    expect(usePageMeta).toHaveBeenCalledWith({ title: "errors.pageNotFoundTitle", description: "errors.pageNotFound" });
  });
});
