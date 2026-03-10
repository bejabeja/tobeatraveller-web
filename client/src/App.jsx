import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Route, Routes, useLocation } from "react-router-dom";
import "./App.scss";
import Footer from "./components/footer/Footer";
import Navbar from "./components/navbar/Navbar";
import Topbar from "./components/topbar/Topbar";
import PrivateLayout from "./pages/PrivateLayout";
import Login from "./pages/auth/Login";
import Logout from "./pages/auth/Logout";
import Signup from "./pages/auth/Signup";
import Explore from "./pages/explore/Explore";
import Home from "./pages/home/Home";
import Itinerary from "./pages/itinerary/Itinerary";
import CreateItinerary from "./pages/itinerary/create/CreateItinerary";
import EditItinerary from "./pages/itinerary/edit/EditItinerary";
import MyItineraries from "./pages/myItineraries/MyItineraries";
import EditProfile from "./pages/profile/EditProfile";
import Profile from "./pages/profile/Profile";
import { clearError, initAuthUser } from "./store/auth/authActions";

import CustomToaster from "./components/toast/CustomToaster";
import Community from "./pages/community/Community";
import Favorites from "./pages/favorites/Favorites";
import FollowersList from "./pages/follows/FollowersList";
import FollowingList from "./pages/follows/FollowingList";
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

  const publicRoutes = ["/", "/explore", "/community"];

  const isPublicRoute = publicRoutes.some((route) => {
    const regex = new RegExp(`^${route.replace(/:[^\s/]+/g, "[^/]+")}$`);
    return regex.test(location.pathname);
  });

  return (
    <div className="App ">
      <CustomToaster />
      <div className="side-content">
        <Navbar />
      </div>
      <div className="main-content">
        {isAuthenticated && (
          <div className="header">
            <Topbar />
          </div>
        )}
        <div className="content">
          <Routes>
            {/* public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Signup />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/community" element={<Community />} />

            {/* routes to decide if private or not */}
            <Route path="/friend-profile/:id" element={<Profile />} />
            <Route path="/itinerary/:id" element={<Itinerary />} />
            <Route path="/profile/:id/followers" element={<FollowersList />} />
            <Route path="/profile/:id/following" element={<FollowingList />} />

            {/* private routes */}
            <Route element={<PrivateLayout />}>
              <Route path="/my-itineraries" element={<MyItineraries />} />
              <Route path="/itineraries/saved" element={<Favorites />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="profile/edit/:id" element={<EditProfile />} />
              <Route path="/create-itinerary" element={<CreateItinerary />} />
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
