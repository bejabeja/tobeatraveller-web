import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { ADMIN_ROLES } from "@tobeatraveller/shared";
import PageSkeleton from "../components/pageSkeleton/PageSkeleton";
import { selectAuthUser } from "../store/auth/authSelectors";
import { selectMe, selectMeLoading } from "../store/user/userInfoSelectors";

const InternalGuard = () => {
  const authUser = useSelector(selectAuthUser);
  const meDetail = useSelector(selectMe);
  const meLoading = useSelector(selectMeLoading);

  // Wait for the authoritative /users/me fetch before deciding: a role change
  // (e.g. just promoted to admin) may not be reflected yet in the cached
  // session used to hydrate the app on load, and redirecting on that stale
  // value would incorrectly lock out a real admin.
  if (meLoading && !meDetail) {
    return <PageSkeleton />;
  }

  const user = meDetail ?? authUser;

  return ADMIN_ROLES.includes(user?.role) ? <Outlet /> : <Navigate to="/" replace />;
};

export default InternalGuard;
