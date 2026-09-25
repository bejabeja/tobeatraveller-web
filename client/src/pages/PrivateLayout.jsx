import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Spinner from "../components/spinner/Spinner";
import { selectIsAuthChecked, selectIsAuthenticated } from "../store/auth/authSelectors";

const PrivateLayout = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAuthChecked = useSelector(selectIsAuthChecked);
  const location = useLocation();

  // Opening or reloading a private page, the stored session is still being
  // checked: deciding now would send a signed-in user to log in.
  if (!isAuthChecked) return <Spinner />;
  if (isAuthenticated) return <Outlet />;
  // The login page takes them back here once signed in.
  return <Navigate to="/login" replace state={{ redirectTo: `${location.pathname}${location.search}` }} />;
};

export default PrivateLayout;
