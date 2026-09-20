import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RiUserCommunityLine } from "react-icons/ri";
import LoadingButton from "../../components/LoadingButton.jsx";
import UsersSection from "../../components/users/UsersSection.jsx";
import useDebouncedEffect from "../../hooks/useDebounced.js";
import { usePageMeta } from "../../hooks/usePageMeta.js";
import { selectIsAuthenticated } from "../../store/auth/authSelectors.js";
import {
  initAllUsers, loadMoreUsers,
  selectAllUsers,
  selectAllUsersCurrentPage,
  selectAllUsersError,
  selectAllUsersLoading,
  selectAllUsersLoadingMore,
  selectAllUsersTotalPages,
} from "@tobeatraveller/shared";
import Error from "../error/Error.jsx";
import "./Community.scss";

const Community = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const users = useSelector(selectAllUsers);
  const loading = useSelector(selectAllUsersLoading);
  const loadingMore = useSelector(selectAllUsersLoadingMore);
  const error = useSelector(selectAllUsersError);
  const currentPage = useSelector(selectAllUsersCurrentPage);
  const totalPages = useSelector(selectAllUsersTotalPages);

  usePageMeta({ title: t("community.title"), description: t("community.subtitle") });

  // Defaults to "most trips" rather than alphabetical: browsing travellers
  // A-Z reads like a directory/admin table, not social discovery.
  const [searchName, setSearchName] = useState("");
  const [sortBy, setSortBy] = useState("itineraries");
  const loadMoreRef = useRef(null);
  const hasMore = currentPage < totalPages;

  const SORT_OPTIONS = [
    { value: "itineraries", label: t("community.sortMostTrips") },
    { value: "username", label: t("community.sortAZ") },
  ];

  const handleLoadMore = () => {
    if (hasMore) {
      dispatch(loadMoreUsers(currentPage + 1, searchName, sortBy)).then(() => {
        loadMoreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const handleRetry = () => dispatch(initAllUsers({ searchName, sortBy, page: 1 }));
  const handleFilterChange = (e) => setSearchName(e.target.value);
  const handleSortChange = (e) => setSortBy(e.target.value);
  const handleReset = () => {
    setSearchName("");
    setSortBy("itineraries");
  };

  useDebouncedEffect(
    () => {
      if (isAuthenticated) {
        dispatch(initAllUsers({ searchName, sortBy, page: 1 }));
      }
    },
    [searchName, sortBy],
    400
  );

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(initAllUsers({ page: 1, sortBy: "itineraries" }));
    }
  }, [isAuthenticated, dispatch]);

  const hero = (
    <div className="community__hero">
      <RiUserCommunityLine className="community__hero-icon" />
      <h1 className="community__hero-title">{t("community.title")}</h1>
      <p className="community__hero-subtitle">
        {t("community.subtitle")}
      </p>
      <span className="community__hero-count">{t("community.growingCommunity")}</span>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="community">
        {hero}
        <div className="community__guest-preview section__container">
          <UsersSection users={users} isLoading={loading} />
          <div className="community__guest-blur" />
        </div>
        <div className="community__guest-cta">
          <h2>{t("community.joinCommunity")}</h2>
          <p>{t("community.joinCommunityDesc")}</p>
          <div className="community__guest-cta-buttons">
            <button className="btn btn--primary" onClick={() => navigate("/register")}>
              {t("community.createAccount")}
            </button>
            <button className="btn btn--secondary" onClick={() => navigate("/login")}>
              {t("community.logIn")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Error message={t("community.errorMsg")} />
    );
  }

  return (
    <div className="community">
      {hero}
      <div className="community__content section__container">
        <Filters
          searchName={searchName}
          sortBy={sortBy}
          handleFilterChange={handleFilterChange}
          handleSortChange={handleSortChange}
          handleReset={handleReset}
          sortOptions={SORT_OPTIONS}
          t={t}
        />

        <div className="community__results">
          {searchName && (
            <p className="community__results-label">
              {t("community.resultsFor", { query: searchName })}
            </p>
          )}

          {!users?.length && !loading && (
            <div className="community__no-results">
              {searchName ? (
                <>
                  <p>{t("community.noTravelers")}</p>
                  <p>{t("community.tryAdjusting")}</p>
                  <button type="button" className="community__clear-search" onClick={handleReset}>
                    {t("community.clearSearch")}
                  </button>
                </>
              ) : (
                <p>{t("community.noTravellersFound")}</p>
              )}
            </div>
          )}

          <UsersSection users={users} isLoading={loading && !users?.length} />

          {hasMore && (
            <div ref={loadMoreRef} className="community__results-ctas">
              <LoadingButton onClick={handleLoadMore} isLoading={loadingMore}>
                {t("community.loadMore")}
              </LoadingButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;

const Filters = ({ searchName, sortBy, handleFilterChange, handleSortChange, handleReset, sortOptions, t }) => (
  <div className="community__filters">
    <label>
      {t("community.search")}
      <input
        type="text"
        name="searchName"
        value={searchName}
        placeholder={t("community.searchPlaceholder")}
        onChange={handleFilterChange}
      />
    </label>

    <label>
      {t("community.sortBy")}
      <select name="sortBy" value={sortBy} onChange={handleSortChange}>
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>

    <button onClick={handleReset} className="btn btn--ghost">
      {t("community.reset")}
    </button>
  </div>
);
