import { useTranslation } from "react-i18next";
import { formatDate } from "@tobeatraveller/shared";
import "./ItineraryDraftPrompt.scss";

// Shown instead of a form that would start empty over a trip left unfinished:
// the person decides before anything is saved.
const ItineraryDraftPrompt = ({ draft, onContinue, onDiscard }) => {
  const { t, i18n } = useTranslation();
  const name = draft.values.title || draft.values.destination?.name || "";
  const savedOn = formatDate(draft.savedAt, i18n.resolvedLanguage, { dateStyle: "medium" });

  return (
    <div className="draft-prompt" role="region" aria-labelledby="draft-prompt-title">
      <span className="draft-prompt__emoji" aria-hidden="true">📝</span>
      <h1 id="draft-prompt-title" className="draft-prompt__title">{t("createItinerary.draftTitle")}</h1>
      <p className="draft-prompt__desc">{t("createItinerary.draftDesc", { title: name, date: savedOn })}</p>
      <p className="draft-prompt__note">{t("createItinerary.draftNote")}</p>
      <div className="draft-prompt__actions">
        <button type="button" className="btn btn--primary" onClick={onContinue}>{t("createItinerary.draftContinue")}</button>
        <button type="button" className="btn btn--secondary" onClick={onDiscard}>{t("createItinerary.draftDiscard")}</button>
      </div>
    </div>
  );
};

export default ItineraryDraftPrompt;
