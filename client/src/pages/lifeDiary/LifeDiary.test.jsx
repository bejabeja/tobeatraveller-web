import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: "es" } }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../services/lifeDiary", () => ({
  getLifeDiaryEntries: jest.fn(),
  getLifeDiaryUsage: jest.fn(() => Promise.resolve({ limited: false })),
  deleteLifeDiaryEntry: jest.fn(),
}));
jest.mock("./LifeDiaryFormModal", () => () => null);
jest.mock("../../components/toolPage/ToolHeader", () => () => null);

import { getLifeDiaryEntries } from "../../services/lifeDiary";
import LifeDiary from "./LifeDiary";

// Regression: the date showed as "2026-09-21" whatever the language.
it("dates each entry the way the app language does", async () => {
  getLifeDiaryEntries.mockResolvedValue([{ id: "l1", entryDate: "2026-09-21", location: { name: "Sagres" }, bestMoment: "Atardecer", images: [] }]);

  render(<MemoryRouter><LifeDiary /></MemoryRouter>);

  expect(await screen.findByText("21 sept 2026")).toBeInTheDocument();
});
