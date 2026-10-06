import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../services/contentReports", () => ({ submitReport: jest.fn() }));
jest.mock("../modal/Modal", () => ({ isOpen, children, onConfirm, confirmDisabled, confirmText }) => (isOpen ? (
  <form onSubmit={(event) => { event.preventDefault(); if (!confirmDisabled) onConfirm(); }}>
    {children}
    <button type="submit" disabled={confirmDisabled}>{confirmText}</button>
  </form>
) : null));

import toast from "react-hot-toast";
import { submitReport } from "../../services/contentReports";
import ReportModal from "./ReportModal";

const renderModal = (props = {}) => render(
  <ReportModal isOpen onClose={jest.fn()} targetType="comment" targetId="comment-1" {...props} />,
);

describe("ReportModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    submitReport.mockResolvedValue({});
  });

  it("cannot be sent until a reason is chosen", () => {
    renderModal();

    expect(screen.getByRole("button", { name: "report.submit" })).toBeDisabled();
  });

  it("sends the reason and the target, tells the person and closes", async () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByLabelText("report.reason.spam"));
    fireEvent.click(screen.getByRole("button", { name: "report.submit" }));

    await waitFor(() => expect(submitReport).toHaveBeenCalledWith({ targetType: "comment", targetId: "comment-1", reason: "spam", details: "" }));
    expect(toast.success).toHaveBeenCalledWith("report.sent");
    expect(onClose).toHaveBeenCalled();
  });

  // The law asks that a notice about illegal content says why it is illegal.
  it("asks to explain why when the content is illegal, and sends once it is explained", async () => {
    renderModal();

    fireEvent.click(screen.getByLabelText("report.reason.illegal"));
    expect(screen.getByRole("button", { name: "report.submit" })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("report.detailsPlaceholder"), { target: { value: "It sells counterfeit goods" } });
    fireEvent.click(screen.getByRole("button", { name: "report.submit" }));

    await waitFor(() => expect(submitReport).toHaveBeenCalledWith(expect.objectContaining({ reason: "illegal", details: "It sells counterfeit goods" })));
  });

  it("keeps the window open and says why when the report could not be sent", async () => {
    const onClose = jest.fn();
    submitReport.mockRejectedValue(new Error("You already reported this"));
    renderModal({ onClose });

    fireEvent.click(screen.getByLabelText("report.reason.spam"));
    fireEvent.click(screen.getByRole("button", { name: "report.submit" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You already reported this"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
