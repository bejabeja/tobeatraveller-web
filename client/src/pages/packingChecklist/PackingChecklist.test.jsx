import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-redux", () => ({ useSelector: () => null }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, fallback) => (typeof fallback === "string" ? fallback : key), i18n: { language: "es" } }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../services/supplies", () => ({ addShoppingListItem: jest.fn() }));
jest.mock("../../services/packingChecklist", () => ({
  getPackingChecklist: jest.fn(),
  addPackingChecklistItem: jest.fn(),
  deletePackingChecklistItem: jest.fn(),
  resetPackingChecklistTrip: jest.fn(),
  seedPackingChecklistDefaults: jest.fn(),
  updatePackingChecklistItem: jest.fn(),
}));

import { getPackingChecklist } from "../../services/packingChecklist";
import PackingChecklist from "./PackingChecklist";

// Without Premium it used to show only a lock: now a sample of the real
// list, blurred behind the offer.
it("shows a sample of the list behind the Premium offer", async () => {
  getPackingChecklist.mockRejectedValue(Object.assign(new Error("Premium required"), { status: 403 }));

  const { container } = render(<MemoryRouter><PackingChecklist /></MemoryRouter>);

  expect(await screen.findByText("premium.requiredCta")).toBeInTheDocument();
  const preview = container.querySelector(".packing-checklist__preview-list");
  expect(preview).toHaveAttribute("aria-hidden", "true");
  expect(preview).toHaveTextContent("Chaqueta impermeable");
});
