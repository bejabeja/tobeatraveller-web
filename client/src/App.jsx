import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Route, Routes, useLocation } from "react-router-dom";
import "./App.scss";
import Footer from "./components/footer/Footer";
import Navbar from "./components/navbar/Navbar";
import PrivateLayout from "./pages/PrivateLayout";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Login from "./pages/auth/Login";
import Logout from "./pages/auth/Logout";
import ResetPassword from "./pages/auth/ResetPassword";
import Signup from "./pages/auth/Signup";
import Explore from "./pages/explore/Explore";
import Home from "./pages/home/Home";
import Itinerary from "./pages/itinerary/Itinerary";
import CreateItinerary from "./pages/itinerary/create/CreateItinerary";
import CreateExperience from "./pages/experience/CreateExperience";
import EditItinerary from "./pages/itinerary/edit/EditItinerary";
import MyItineraries from "./pages/myItineraries/MyItineraries";
import Onboarding from "./pages/onboarding/Onboarding";
import EditProfile from "./pages/profile/EditProfile";
import Profile from "./pages/profile/Profile";
import Settings from "./pages/settings/Settings";
import { clearError, initAuthUser } from "./store/auth/authActions";
import { refreshUnreadCount } from "@tobeatraveller/shared";

import CustomToaster from "./components/toast/CustomToaster";
import Community from "./pages/community/Community";
import Favorites from "./pages/favorites/Favorites";
import FollowersList from "./pages/follows/FollowersList";
import FollowingList from "./pages/follows/FollowingList";
import Contact from "./pages/legal/Contact";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Terms from "./pages/legal/Terms";
import Notifications from "./pages/notifications/Notifications";
import {
  selectAuthUser,
  selectIsAuthenticated,
} from "./store/auth/authSelectors";
import { initFilters } from "./store/filters/filterActions";
import { loadMyUserInfo } from "./store/user/userInfoActions";

const App = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userAuthenticated = useSelector(selectAuthUser);

  useEffect(() => {
    dispatch(initAuthUser());
    dispatch(initFilters());
  }, []);

  useEffect(() => {
    if (isAuthenticated && userAuthenticated?.id) {
      dispatch(loadMyUserInfo(userAuthenticated.id));
    }
  }, [dispatch, isAuthenticated, userAuthenticated?.id]);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch, location]);

  // Poll unread notification count every 30s and on tab focus
  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(refreshUnreadCount());
    const interval = setInterval(() => dispatch(refreshUnreadCount()), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") dispatch(refreshUnreadCount());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [dispatch, isAuthenticated]);

  const publicRoutes = ["/", "/explore", "/community", "/privacy-policy", "/terms", "/contact"];

  const isAuthRoute = ["/login", "/register", "/forgot-password", "/reset-password"].includes(location.pathname);

  const isPublicRoute = publicRoutes.some((route) => {
    const regex = new RegExp(`^${route.replace(/:[^\s/]+/g, "[^/]+")}$`);
    return regex.test(location.pathname);
  });

  return (
    <div className="App ">
      <CustomToaster />
      <div className={`side-content${isAuthRoute ? " side-content--hidden" : ""}`}>
        <Navbar />
      </div>
      <div className={`main-content${isAuthRoute ? " main-content--auth" : ""}`}>
        <div className="content">
          <Routes>
            {/* public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Signup />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/community" element={<Community />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />

            {/* routes to decide if private or not */}
            <Route path="/friend-profile/:id" element={<Profile />} />
            <Route path="/itinerary/:id" element={<Itinerary />} />
            <Route path="/profile/:id/followers" element={<FollowersList />} />
            <Route path="/profile/:id/following" element={<FollowingList />} />

            {/* private routes */}
            <Route element={<PrivateLayout />}>
              <Route path="/welcome" element={<Onboarding />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/my-itineraries" element={<MyItineraries />} />
              <Route path="/itineraries/saved" element={<Favorites />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/profile/edit/:id" element={<EditProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/create-itinerary" element={<CreateItinerary />} />
              <Route path="/create-experience" element={<CreateExperience />} />
              <Route path="/itinerary/edit/:id" element={<EditItinerary />} />
            </Route>
          </Routes>
        </div>

        {isPublicRoute && <Footer />}
      </div>
    </div>
  );
};

export default App;
