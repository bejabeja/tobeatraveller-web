import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LoadingButton from "../../components/LoadingButton.jsx";
import SearchInput from "../../components/searchInput/SearchInput.jsx";
import UsersSection from "../../components/users/UsersSection.jsx";
import useDebouncedEffect from "../../hooks/useDebounced.js";
import { usePageMeta } from "../../hooks/usePageMeta.js";
import { returnToState } from "../../utils/returnTo.js";
import { selectAuthUser, selectIsAuthenticated } from "../../store/auth/authSelectors.js";
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
  const location = useLocation();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authUser = useSelector(selectAuthUser);
  const allUsers = useSelector(selectAllUsers);
  const loading = useSelector(selectAllUsersLoading);
  const loadingMore = useSelector(selectAllUsersLoadingMore);
  const error = useSelector(selectAllUsersError);
  const currentPage = useSelector(selectAllUsersCurrentPage);
  const totalPages = useSelector(selectAllUsersTotalPages);

  const users = allUsers?.filter((user) => user.id !== authUser?.id);

  usePageMeta({ title: t("community.title"), description: t("community.subtitle") });

  // Fixed sort, no user-facing control: browsing travellers is social
  // discovery, not a sortable directory (Instagram/LinkedIn's people
  // discovery doesn't expose a sort toggle either). "Most trips" first is
  // the closest proxy to relevance without a real recommendation engine.
  const SORT_BY = "itineraries";
  const [searchName, setSearchName] = useState("");
  const loadMoreRef = useRef(null);
  const hasMore = currentPage < totalPages;

  const handleLoadMore = () => {
    if (hasMore) {
      dispatch(loadMoreUsers(currentPage + 1, searchName, SORT_BY)).then(() => {
        loadMoreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };


  useDebouncedEffect(
    () => {
      if (isAuthenticated) {
        dispatch(initAllUsers({ searchName, sortBy: SORT_BY, page: 1 }));
      }
    },
    [searchName],
    400
  );

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(initAllUsers({ page: 1, sortBy: "itineraries" }));
    }
  }, [isAuthenticated, dispatch]);

  if (!isAuthenticated) {
    return (
      <div className="community">
        <div className="community__guest-preview section__container">
          <UsersSection users={users} isLoading={loading} />
          <div className="community__guest-blur" />
        </div>
        <div className="community__guest-cta">
          <h2>{t("community.joinCommunity")}</h2>
          <p>{t("community.joinCommunityDesc")}</p>
          <div className="community__guest-cta-buttons">
            <button className="btn btn--primary" onClick={() => navigate("/register", { state: returnToState(location) })}>
              {t("community.createAccount")}
            </button>
            <button className="btn btn--secondary" onClick={() => navigate("/login", { state: returnToState(location) })}>
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
      <div className="community__content section__container">
        {/* The same search box as Explore's, in the same kind of panel. */}
        <div className="community__search">
          <SearchInput
            name="searchName"
            value={searchName}
            onChange={setSearchName}
            placeholder={t("community.searchPlaceholder")}
            label={t("community.search")}
          />
        </div>

        <h1 className="community__results-title">{t("community.travellers")}</h1>

        <div className="community__results">
          {!users?.length && !loading && (
            <div className="community__no-results">
              {/* The search box already says what was searched and clears it:
                  what's left to offer is inviting whoever isn't here yet. */}
              {searchName ? (
                <>
                  <p className="community__no-results-title">{t("community.noTravelersFor", { query: searchName })}</p>
                  <p className="community__no-results-text">{t("community.noTravelersHint")}</p>
                  <Link to="/invite" className="btn btn--primary">{t("community.inviteButton")}</Link>
                </>
              ) : (
                <p>{t("community.noTravellersFound")}</p>
              )}
            </div>
          )}

          {(loading || users?.length > 0) && <UsersSection users={users} isLoading={loading && !users?.length} />}

          {/* The end of the list, however short: a way to bring more people in. */}
          {!hasMore && !loading && !searchName && users?.length > 0 && <InviteCard t={t} />}
          {/* Searching, the person may not be among those found. */}
          {!hasMore && !loading && searchName && users?.length > 0 && (
            <p className="community__search-invite">
              {t("community.searchInvite")} <Link to="/invite">{t("community.inviteButton")}</Link>
            </p>
          )}

          {hasMore && (
            <div ref={loadMoreRef} className="community__results-ctas">
              <LoadingButton onClick={handleLoadMore} isLoading={loadingMore}>
                {t("common.loadMore")}
              </LoadingButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;

const InviteCard = ({ t }) => (
  <aside className="community__invite">
    <strong className="community__invite-title">{t("community.inviteTitle")}</strong>
    <p className="community__invite-text">{t("community.inviteText")}</p>
    <Link to="/invite" className="btn btn--primary community__invite-button">{t("community.inviteButton")}</Link>
  </aside>
);
