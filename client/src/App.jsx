import { lazy, Suspense, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.scss";
import CookieConsentBanner from "./components/cookieConsent/CookieConsentBanner";
import Footer from "./components/footer/Footer";
import GlobalSearch from "./components/navbar/GlobalSearch";
import Navbar from "./components/navbar/Navbar";
import Topbar from "./components/topbar/Topbar";
import Spinner from "./components/spinner/Spinner";
import InternalGuard from "./pages/InternalGuard";
import PrivateLayout from "./pages/PrivateLayout";
import Home from "./pages/home/Home";
import { clearError, initAuthUser } from "./store/auth/authActions";
import { refreshUnreadCount } from "@tobeatraveller/shared";
import { useCanonicalUrl } from "./hooks/useCanonicalUrl";
import { identifyUser, initAnalyticsIfConsented } from "./utils/analytics";

import CustomToaster from "./components/toast/CustomToaster";
import {
  selectAuthUser,
  selectIsAuthenticated,
} from "./store/auth/authSelectors";
import { initFilters } from "./store/filters/filterActions";
import { loadMyUserInfo } from "./store/user/userInfoActions";

// Code-split per route so the initial bundle isn't the whole app; Home stays eager
// since it's the most common cold-landing page and shouldn't wait on a chunk fetch.
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const Logout = lazy(() => import("./pages/auth/Logout"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Explore = lazy(() => import("./pages/explore/Explore"));
const Community = lazy(() => import("./pages/community/Community"));
const Contact = lazy(() => import("./pages/legal/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Itinerary = lazy(() => import("./pages/itinerary/Itinerary"));
const FollowersList = lazy(() => import("./pages/follows/FollowersList"));
const FollowingList = lazy(() => import("./pages/follows/FollowingList"));
const Onboarding = lazy(() => import("./pages/onboarding/Onboarding"));
const Notifications = lazy(() => import("./pages/notifications/Notifications"));
const MyItineraries = lazy(() => import("./pages/myItineraries/MyItineraries"));
const Favorites = lazy(() => import("./pages/favorites/Favorites"));
const EditProfile = lazy(() => import("./pages/profile/EditProfile"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const Subscription = lazy(() => import("./pages/subscription/Subscription"));
const Referral = lazy(() => import("./pages/referral/Referral"));
const Account = lazy(() => import("./pages/account/Account"));
const VanLog = lazy(() => import("./pages/vanLog/VanLog"));
const Supplies = lazy(() => import("./pages/supplies/Supplies"));
const PackingChecklist = lazy(() => import("./pages/packingChecklist/PackingChecklist"));
const LifeDiary = lazy(() => import("./pages/lifeDiary/LifeDiary"));
const CreateItinerary = lazy(() => import("./pages/itinerary/create/CreateItinerary"));
const CreateExperience = lazy(() => import("./pages/experience/CreateExperience"));
const EditExperience = lazy(() => import("./pages/experience/EditExperience"));
const EditItinerary = lazy(() => import("./pages/itinerary/edit/EditItinerary"));
const InternalDashboard = lazy(() => import("./pages/internal/InternalDashboard"));
const InternalUsers = lazy(() => import("./pages/internal/InternalUsers"));
const InternalAuditLog = lazy(() => import("./pages/internal/InternalAuditLog"));
const InternalReferrals = lazy(() => import("./pages/internal/InternalReferrals"));

const App = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userAuthenticated = useSelector(selectAuthUser);
  const [searchOpen, setSearchOpen] = useState(false);

  useCanonicalUrl(location.pathname);

  // Shared between Navbar's mobile bottom-nav trigger and Topbar's desktop
  // trigger, which are siblings (not parent/child), so the modal itself
  // lives here rather than inside either one.
  useEffect(() => setSearchOpen(false), [location]);

  useEffect(() => {
    initAnalyticsIfConsented();
    dispatch(initAuthUser());
    dispatch(initFilters());
  }, []);

  useEffect(() => {
    if (isAuthenticated && userAuthenticated?.id) {
      dispatch(loadMyUserInfo(userAuthenticated.id));
      identifyUser(userAuthenticated);
    }
  }, [dispatch, isAuthenticated, userAuthenticated]);

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

  const publicRoutes = ["/", "/explore", "/community", "/subscription", "/privacy-policy", "/terms", "/contact"];

  const isAuthRoute = ["/login", "/register", "/forgot-password", "/reset-password"].includes(location.pathname);

  const isPublicRoute = publicRoutes.some((route) => {
    const regex = new RegExp(`^${route.replace(/:[^\s/]+/g, "[^/]+")}$`);
    return regex.test(location.pathname);
  });

  // Anonymous visitors get a horizontal top nav (marketing site layout)
  // instead of the logged-in app's left sidebar; not on auth routes, which
  // hide the nav entirely and always render full-width.
  const showMarketingNav = !isAuthenticated && !isAuthRoute;

  return (
    <div className={`App${showMarketingNav ? " App--marketing" : ""}`}>
      <CustomToaster />
      <CookieConsentBanner />
      <div className={`side-content${isAuthRoute ? " side-content--hidden" : ""}`}>
        <Navbar onOpenSearch={() => setSearchOpen(true)} />
      </div>
      <div className={`main-content${isAuthRoute ? " main-content--auth" : ""}`}>
        {isAuthenticated && !isAuthRoute && <Topbar onOpenSearch={() => setSearchOpen(true)} />}
        <main className="content">
          <Suspense fallback={<Spinner />}>
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
              <Route path="/subscription" element={<Subscription />} />
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
                <Route path="/account" element={<Account />} />
                <Route path="/invite" element={<Referral />} />
                <Route path="/my-itineraries" element={<MyItineraries />} />
                <Route path="/itineraries/saved" element={<Favorites />} />
                <Route path="/van-log" element={<VanLog />} />
                <Route path="/supplies" element={<Supplies />} />
                <Route path="/packing-checklist" element={<PackingChecklist />} />
                <Route path="/life-diary" element={<LifeDiary />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/profile/edit/:id" element={<EditProfile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/create-itinerary" element={<CreateItinerary />} />
                <Route path="/create-experience" element={<CreateExperience />} />
                <Route path="/experience/edit/:id" element={<EditExperience />} />
                <Route path="/itinerary/edit/:id" element={<EditItinerary />} />

                <Route element={<InternalGuard />}>
                  <Route path="/internal" element={<InternalDashboard />}>
                    <Route index element={<Navigate to="/internal/users" replace />} />
                    <Route path="users" element={<InternalUsers />} />
                    <Route path="audit-log" element={<InternalAuditLog />} />
                    <Route path="referrals" element={<InternalReferrals />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </main>

        {isPublicRoute && <Footer />}
      </div>

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default App;
