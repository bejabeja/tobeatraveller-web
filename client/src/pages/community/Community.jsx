import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RiUserCommunityLine } from "react-icons/ri";
import LoadingButton from "../../components/LoadingButton.jsx";
import UsersSection from "../../components/users/UsersSection.jsx";
import useDebouncedEffect from "../../hooks/useDebounced.js";
import { selectIsAuthenticated } from "../../store/auth/authSelectors.js";
import { initAllUsers, loadMoreUsers } from "../../store/users/usersActions";
import {
  selectAllUsers,
  selectAllUsersCurrentPage,
  selectAllUsersError,
  selectAllUsersLoading,
  selectAllUsersLoadingMore,
  selectAllUsersTotalCount,
  selectAllUsersTotalPages,
} from "../../store/users/usersSelectors";
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
  const totalCount = useSelector(selectAllUsersTotalCount);

  const [searchName, setSearchName] = useState("");
  const [sortBy, setSortBy] = useState("username");
  const loadMoreRef = useRef(null);
  const hasMore = currentPage < totalPages;

  const SORT_OPTIONS = [
    { value: "username", label: t("community.sortAZ") },
    { value: "itineraries", label: t("community.sortMostItineraries") },
  ];

  const handleLoadMore = () => {
    if (hasMore) {
      dispatch(loadMoreUsers(currentPage + 1, searchName, sortBy));
    }
  };

  const handleRetry = () => dispatch(initAllUsers({ searchName, sortBy, page: 1 }));
  const handleFilterChange = (e) => setSearchName(e.target.value);
  const handleSortChange = (e) => setSortBy(e.target.value);
  const handleReset = () => {
    setSearchName("");
    setSortBy("username");
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
      dispatch(initAllUsers({ page: 1 }));
    }
  }, [isAuthenticated, dispatch]);

  const hero = (
    <div className="community__hero">
      <RiUserCommunityLine className="community__hero-icon" />
      <h1 className="community__hero-title">{t("community.title")}</h1>
      <p className="community__hero-subtitle">
        {t("community.subtitle")}
      </p>
      {totalCount > 0 && (
        <span className="community__hero-count">{t("community.members", { count: totalCount })}</span>
      )}
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
              <p>{t("community.noTravelers")}</p>
              <p>{t("community.tryAdjusting")}</p>
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
