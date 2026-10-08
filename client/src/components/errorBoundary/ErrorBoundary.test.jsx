import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

import ErrorBoundary from "./ErrorBoundary";

let shouldFail = true;
const Page = () => {
  if (shouldFail) throw new Error("boom");
  return <p>the page</p>;
};

const renderPage = () => render(<MemoryRouter><ErrorBoundary><Page /></ErrorBoundary></MemoryRouter>);

beforeEach(() => {
  shouldFail = true;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

// Regression-in-waiting: a page that threw left the app blank, with no message and no way back.
it("says something went wrong, with a way back, when the page fails to draw", () => {
  renderPage();

  expect(screen.getByText("errors.title")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "errors.backHome" })).toBeInTheDocument();
});

it("draws the page again when they try again and it works this time", () => {
  renderPage();
  shouldFail = false;

  fireEvent.click(screen.getByRole("button", { name: "common.retry" }));

  expect(screen.getByText("the page")).toBeInTheDocument();
});

it("does not get in the way of a page that draws fine", () => {
  shouldFail = false;

  renderPage();

  expect(screen.getByText("the page")).toBeInTheDocument();
  expect(screen.queryByText("errors.title")).not.toBeInTheDocument();
});
