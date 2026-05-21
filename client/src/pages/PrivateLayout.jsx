import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import {
  selectAuthLoading,
  selectIsAuthenticated,
} from "../store/auth/authSelectors";

const PrivateLayout = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);

  if (authLoading) return null;

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateLayout;
