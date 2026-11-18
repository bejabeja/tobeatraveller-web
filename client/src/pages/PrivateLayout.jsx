import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import PageSkeleton from "../components/pageSkeleton/PageSkeleton";
import { selectIsAuthChecked, selectIsAuthenticated } from "../store/auth/authSelectors";

const PrivateLayout = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAuthChecked = useSelector(selectIsAuthChecked);
  const location = useLocation();

  // Opening or reloading a private page, the stored session is still being
  // checked: deciding now would send a signed-in user to log in. The same skeleton as while
  // the page's code arrives, so the wait does not change look halfway.
  if (!isAuthChecked) return <PageSkeleton />;
  if (isAuthenticated) return <Outlet />;
  // The login page takes them back here once signed in.
  return <Navigate to="/login" replace state={{ redirectTo: `${location.pathname}${location.search}` }} />;
};

export default PrivateLayout;
