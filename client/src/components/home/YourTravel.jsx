import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { draftToResume, ITINERARY_DRAFT_KINDS, summarizePassport } from "@tobeatraveller/shared";
import { useUserPassport } from "../../hooks/useUserPassport";
import { readItineraryDraft } from "../../utils/itineraryDraftStorage";
import "./YourTravel.scss";

const NO_FLAGS = 0;

const DRAFT_PATHS = {
  [ITINERARY_DRAFT_KINDS.FORM]: "/create-itinerary",
  [ITINERARY_DRAFT_KINDS.AI_PLAN]: "/create-experience",
};

// The Home of someone who does not live in a van: what they left half done,
// and where their passport stands. The counterpart of VanToday.
const YourTravel = ({ userId }) => {
  const { t } = useTranslation();
  const { passport } = useUserPassport(userId);
  const summary = summarizePassport(passport, NO_FLAGS);
  // Read when Home opens: coming back from the form mounts it again.
  const draft = useMemo(() => draftToResume({
    form: readItineraryDraft(userId, ITINERARY_DRAFT_KINDS.FORM),
    plan: readItineraryDraft(userId, ITINERARY_DRAFT_KINDS.AI_PLAN),
  }), [userId]);

  if (!draft && !summary) return null;

  return (
    <div className="your-travel">
      {draft && (
        <Link to={DRAFT_PATHS[draft.kind]} className="your-travel__card your-travel__card--draft">
          <span className="your-travel__label">{t("home.draftLabel")}</span>
          <strong className="your-travel__value">{draft.name || t("home.draftUnnamed")}</strong>
          <span className="your-travel__hint">{t("home.draftContinue")} →</span>
        </Link>
      )}
      {summary && (
        <Link to={`/profile/${userId}/passport`} className="your-travel__card">
          <span className="your-travel__label">🛂 {t("passport.title")}</span>
          <strong className="your-travel__value">
            {summary.countryCount > 0 ? t("passport.countriesCount", { count: summary.countryCount }) : t("passport.noCountriesYet")}
          </strong>
          <span className="your-travel__hint">{t("passport.collected", { earned: summary.earnedCount, total: summary.totalCount })}</span>
        </Link>
      )}
    </div>
  );
};

export default YourTravel;
