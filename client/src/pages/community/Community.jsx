import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
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

const SORT_OPTIONS = [
  { value: "username", label: "A-Z" },
  { value: "itineraries", label: "Most itineraries" },
];

const Community = () => {
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
      <h1 className="community__hero-title">Community</h1>
      <p className="community__hero-subtitle">
        Discover travellers from around the world
      </p>
      {totalCount > 0 && (
        <span className="community__hero-count">{totalCount} members</span>
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
          <h2>Join the community</h2>
          <p>Sign up to see all travellers, follow people you like, and get inspired for your next trip.</p>
          <div className="community__guest-cta-buttons">
            <button className="btn btn--primary" onClick={() => navigate("/register")}>
              Create account
            </button>
            <button className="btn btn--secondary" onClick={() => navigate("/login")}>
              Log in
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Error message="We couldn't load the community page. Please try again later." />
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
        />

        <div className="community__results">
          {searchName && (
            <p className="community__results-label">
              Results for &quot;{searchName}&quot;
            </p>
          )}

          {!users?.length && !loading && (
            <div className="community__no-results">
              <p>No travellers found with that name.</p>
              <p>Try adjusting your search.</p>
            </div>
          )}

          <UsersSection users={users} isLoading={loading && !users?.length} />

          {hasMore && (
            <div ref={loadMoreRef} className="community__results-ctas">
              <LoadingButton onClick={handleLoadMore} isLoading={loadingMore}>
                Load more
              </LoadingButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;

const Filters = ({ searchName, sortBy, handleFilterChange, handleSortChange, handleReset }) => (
  <div className="community__filters">
    <label>
      Search
      <input
        type="text"
        name="searchName"
        value={searchName}
        placeholder="Search by username..."
        onChange={handleFilterChange}
      />
    </label>

    <label>
      Sort by
      <select name="sortBy" value={sortBy} onChange={handleSortChange}>
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>

    <button onClick={handleReset} className="btn btn--ghost">
      Reset
    </button>
  </div>
);
