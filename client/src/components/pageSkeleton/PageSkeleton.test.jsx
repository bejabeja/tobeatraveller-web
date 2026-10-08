import { render, screen } from "@testing-library/react";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

import PageSkeleton from "./PageSkeleton";

it("tells assistive technology the page is loading, since it shows only grey blocks", () => {
  render(<PageSkeleton />);

  expect(screen.getByRole("status", { name: "common.loading" })).toHaveAttribute("aria-busy", "true");
});
