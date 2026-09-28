import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join("/")}` : key) }) }));
jest.mock("../../services/packingChecklist", () => ({ getPackingLists: jest.fn() }));

import { getPackingLists } from "../../services/packingChecklist";
import TripLists from "./TripLists";

it("lists the trip's packing lists and offers a new one for it", async () => {
  getPackingLists.mockResolvedValue({ lists: [
    { id: "l1", name: "Equipaje", itemCount: 12, checkedCount: 4, itinerary: { id: "t1", title: "Algarve" } },
    { id: "l2", name: "Otra", itemCount: 0, checkedCount: 0, itinerary: { id: "t9", title: "Otro" } },
  ] });

  render(<MemoryRouter><TripLists itineraryId="t1" /></MemoryRouter>);

  expect(await screen.findByRole("link", { name: /Equipaje/ })).toHaveAttribute("href", "/packing-checklist/l1");
  expect(screen.queryByText("Otra")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /packingChecklist.newListForTrip/ })).toHaveAttribute("href", "/packing-checklist?forTrip=t1");
});
