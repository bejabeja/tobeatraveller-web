import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join("/")}` : key), i18n: { language: "en" } }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../services/contentReports", () => ({ getReports: jest.fn(), decideReport: jest.fn() }));
jest.mock("../../components/featureLoadState/FeatureLoadState", () => ({ onRetry }) => <button onClick={onRetry}>retry</button>);
jest.mock("../../components/LoadingButton", () => ({ children, onClick }) => <button onClick={onClick}>{children}</button>);
jest.mock("../../components/spinner/Spinner", () => () => <p>loading</p>);

import toast from "react-hot-toast";
import { decideReport, getReports } from "../../services/contentReports";
import InternalReports from "./InternalReports";

const report = (overrides = {}) => ({
  id: "r1", status: "open", reason: "spam", targetType: "comment", targetId: "c1", targetExcerpt: "buy now!!",
  targetOwnerUsername: "bob", reporterUsername: "ana", details: null, createdAt: "2026-10-06T10:00:00Z", ...overrides,
});

const renderPage = () => render(<MemoryRouter><InternalReports /></MemoryRouter>);

describe("InternalReports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getReports.mockResolvedValue({ reports: [report()], totalCount: 1 });
    decideReport.mockResolvedValue(null);
  });

  it("asks for the open reports first and shows what was reported and by whom", async () => {
    renderPage();

    expect(await screen.findByText("buy now!!")).toBeInTheDocument();
    expect(getReports).toHaveBeenCalledWith({ status: "open", limit: 20 });
    expect(screen.getByText("admin.reportBy:@ana")).toBeInTheDocument();
  });

  it("removes the content with the note, tells the team and reloads the queue", async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText("admin.reportNoteLabel"), { target: { value: "it was spam" } });

    fireEvent.click(screen.getByRole("button", { name: "admin.reportRemove" }));

    await waitFor(() => expect(decideReport).toHaveBeenCalledWith("r1", { decision: "remove", note: "it was spam" }));
    expect(toast.success).toHaveBeenCalledWith("admin.reportDecided");
    await waitFor(() => expect(getReports).toHaveBeenCalledTimes(2));
  });

  it("offers no remove button for a profile, only the decision made elsewhere", async () => {
    getReports.mockResolvedValue({ reports: [report({ targetType: "user", targetId: "u2" })], totalCount: 1 });
    renderPage();

    expect(await screen.findByRole("button", { name: "admin.reportResolve" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "admin.reportRemove" })).not.toBeInTheDocument();
  });

  it("offers no decision on a report that is already decided", async () => {
    getReports.mockResolvedValue({ reports: [report({ status: "dismissed" })], totalCount: 1 });
    renderPage();

    await screen.findByText("buy now!!");

    expect(screen.queryByRole("button", { name: "admin.reportDismiss" })).not.toBeInTheDocument();
  });

  it("says when the decision could not be saved and keeps the report in the queue", async () => {
    decideReport.mockRejectedValue(new Error("This report was already decided"));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "admin.reportDismiss" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This report was already decided"));
    expect(getReports).toHaveBeenCalledTimes(1);
  });
});
