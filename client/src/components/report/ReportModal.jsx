import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS, reportDetailsError } from "@tobeatraveller/shared";
import { submitReport } from "../../services/contentReports";
import Modal from "../modal/Modal";
import "./ReportModal.scss";

// Reports a comment, a trip or a profile. The team reads it; the reported
// person is never told who sent it.
const ReportModal = ({ isOpen, onClose, targetType, targetId }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const detailsError = reason ? reportDetailsError({ reason, details }) : null;
  const isIllegal = reason === REPORT_REASONS.ILLEGAL;

  const close = () => {
    setReason("");
    setDetails("");
    onClose();
  };

  const send = async () => {
    setSending(true);
    try {
      await submitReport({ targetType, targetId, reason, details });
      toast.success(t("report.sent"));
      close();
    } catch (error) {
      toast.error(error.message || t("report.sendError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      onConfirm={send}
      title={t(`report.title.${targetType}`)}
      description={t("report.intro")}
      confirmText={t("report.submit")}
      loading={sending}
      confirmDisabled={!reason || Boolean(detailsError)}
    >
      <fieldset className="report-modal__reasons">
        <legend>{t("report.reasonLabel")}</legend>
        {Object.values(REPORT_REASONS).map((value) => (
          <label key={value} className="report-modal__reason">
            <input type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
            <span>{t(`report.reason.${value}`)}</span>
          </label>
        ))}
      </fieldset>
      {/* Always there, so the window does not grow (and the button move) when a reason is chosen. */}
      <label className="report-modal__details">
        <span>{t(isIllegal ? "report.detailsLabelIllegal" : "report.detailsLabel")}</span>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={REPORT_DETAILS_MAX_LENGTH}
          placeholder={t("report.detailsPlaceholder")}
          rows={4}
        />
        <small role="status" className="report-modal__hint">{isIllegal && detailsError ? t(detailsError) : ""}</small>
      </label>
    </Modal>
  );
};

export default ReportModal;
