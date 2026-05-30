import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection";
import { setUserInfoItineraries } from "../../store/user/userInfoActions";
import {
  selectMe,
  selectMeError,
  selectMyItineraries,
  selectMyItinerariesError,
  selectMyItinerariesLoading,
} from "../../store/user/userInfoSelectors";
import { filterItineraries } from "@tobeatraveller/shared";
import "./MyItineraries.scss";
import Filters from "./filters/Filters";

const MyItineraries = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const userMe = useSelector(selectMe);
  const myItineraries = useSelector(selectMyItineraries);
  const myItinerariesLoading = useSelector(selectMyItinerariesLoading);
  const myItinerariesError = useSelector(selectMyItinerariesError);
  const userMeError = useSelector(selectMeError);

  const [filters, setFilters] = useState({});
  const [visibility, setVisibility] = useState('all');

  useEffect(() => {
    dispatch(setUserInfoItineraries());
  }, [dispatch]);

  const filteredItineraries = useMemo(() => {
    return filterItineraries(myItineraries, { ...filters, visibility: visibility === 'all' ? '' : visibility });
  }, [myItineraries, filters, visibility]);

  const hasActiveFilters = Object.values(filters).some(Boolean) || visibility !== 'all';

  if (userMeError) {
    return <div>Error: {userMeError}</div>;
  }

  const handleRetry = () => {
    dispatch(setUserInfoItineraries());
  };

  return (
    <section className="my-itineraries section__container">
      <div className="my-itineraries__section-ctas">
        <Link to="/create-itinerary" className="btn btn--primary">
          {t("myItineraries.planTrip")}
        </Link>
      </div>

      <div className="my-itineraries__visibility-toggle">
        {[
          { val: 'all',     label: t('myItineraries.all')     || 'All' },
          { val: 'public',  label: '🌍 ' + (t('myItineraries.public')  || 'Public') },
          { val: 'private', label: '🔒 ' + (t('myItineraries.private') || 'Private') },
        ].map(opt => (
          <button
            key={opt.val}
            type="button"
            className={`my-itineraries__vis-btn${visibility === opt.val ? ' my-itineraries__vis-btn--active' : ''}`}
            onClick={() => setVisibility(opt.val)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Filters onChange={setFilters} />

      {myItinerariesError ? (
        <div className="explore__error">
          <p className="error-message">
            {t("myItineraries.errorMsg")}
          </p>
          <button className="btn btn--ghost" onClick={handleRetry}>
            {t("myItineraries.tryAgain")}
          </button>
        </div>
      ) : filteredItineraries.length === 0 && !myItinerariesLoading ? (
        <div className="explore__no-results">
          {hasActiveFilters ? (
            <>
              <p>{t("myItineraries.noFiltersResults")}</p>
              <p>{t("myItineraries.tryAdjusting")}</p>
            </>
          ) : (
            <>
              <p>{t("myItineraries.noItineraries")}</p>
              <Link to="/create-itinerary" className="btn btn--primary" style={{ marginTop: "12px", display: "inline-block" }}>
                {t("myItineraries.planFirstTrip")}
              </Link>
            </>
          )}
        </div>
      ) : (
        <ItinerariesSection
          user={userMe}
          itineraries={filteredItineraries}
          isLoading={myItinerariesLoading}
          isOwner
        />
      )}
    </section>
  );
};

export default MyItineraries;
