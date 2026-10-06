import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: "es" } }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../services/lifeDiary", () => ({
  getLifeDiaryEntries: jest.fn(),
  getLifeDiaryUsage: jest.fn(() => Promise.resolve({ limited: false })),
  deleteLifeDiaryEntry: jest.fn(),
}));
jest.mock("../../components/LoadingButton", () => ({ children, onClick }) => <button onClick={onClick}>{children}</button>);
jest.mock("./LifeDiaryFormModal", () => () => null);
jest.mock("../../components/toolPage/ToolHeader", () => () => null);

import { getLifeDiaryEntries } from "../../services/lifeDiary";
import toast from "react-hot-toast";
import LifeDiary from "./LifeDiary";

const entry = (id, entryDate) => ({ id, entryDate, location: { name: "Sagres" }, bestMoment: `moment ${id}`, images: [] });

// Regression: the date showed as "2026-09-21" whatever the language.
it("dates each entry the way the app language does", async () => {
  getLifeDiaryEntries.mockResolvedValue({ entries: [entry("l1", "2026-09-21")], totalCount: 1 });

  render(<MemoryRouter><LifeDiary /></MemoryRouter>);

  expect(await screen.findByText("21 sept 2026")).toBeInTheDocument();
});

describe("the diary by pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLifeDiaryEntries.mockReset();
  });

  it("offers the rest when there are more entries than the first page", async () => {
    getLifeDiaryEntries.mockResolvedValueOnce({ entries: [entry("l1", "2026-09-21")], totalCount: 2 });

    render(<MemoryRouter><LifeDiary /></MemoryRouter>);

    expect(await screen.findByRole("button", { name: "common.loadMore" })).toBeInTheDocument();
  });

  it("loads the next entries from where the list ends, without repeating any", async () => {
    getLifeDiaryEntries
      .mockResolvedValueOnce({ entries: [entry("l1", "2026-09-21")], totalCount: 2 })
      .mockResolvedValueOnce({ entries: [entry("l1", "2026-09-21"), entry("l2", "2026-09-01")], totalCount: 2 });
    render(<MemoryRouter><LifeDiary /></MemoryRouter>);

    await userEvent.click(await screen.findByRole("button", { name: "common.loadMore" }));

    expect(await screen.findByText('"moment l2"')).toBeInTheDocument();
    expect(getLifeDiaryEntries).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 1 }));
    expect(screen.getAllByText('"moment l1"')).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "common.loadMore" })).not.toBeInTheDocument();
  });

  it("says it could not load more and keeps what it has", async () => {
    getLifeDiaryEntries
      .mockResolvedValueOnce({ entries: [entry("l1", "2026-09-21")], totalCount: 2 })
      .mockRejectedValueOnce(new Error("offline"));
    render(<MemoryRouter><LifeDiary /></MemoryRouter>);

    await userEvent.click(await screen.findByRole("button", { name: "common.loadMore" }));

    await screen.findByText('"moment l1"');
    expect(toast.error).toHaveBeenCalledWith("lifeDiary.loadMoreError");
    expect(screen.getByRole("button", { name: "common.loadMore" })).toBeInTheDocument();
  });

  it("stops offering more when a page comes back empty although the total promised more", async () => {
    getLifeDiaryEntries
      .mockResolvedValueOnce({ entries: [entry("l1", "2026-09-21")], totalCount: 5 })
      .mockResolvedValueOnce({ entries: [], totalCount: 5 });
    render(<MemoryRouter><LifeDiary /></MemoryRouter>);

    await userEvent.click(await screen.findByRole("button", { name: "common.loadMore" }));

    await screen.findByText('"moment l1"');
    expect(screen.queryByRole("button", { name: "common.loadMore" })).not.toBeInTheDocument();
  });
});
