import { useEffect, useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { GoBook, GoHome, GoPerson, GoSignIn, GoSignOut } from "react-icons/go";
import { IoAddOutline, IoSaveOutline, IoSearch } from "react-icons/io5";
import { RiUserCommunityLine } from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { logoutUser } from "../../store/auth/authActions";
import {
  selectAuthLoading,
  selectIsAuthenticated,
} from "../../store/auth/authSelectors";
import { selectMe } from "../../store/user/userInfoSelectors";
import "./Navbar.scss";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);
  const userMe = useSelector(selectMe);

  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const toggleNavbar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <section>
      <div className="navbar-section">
        <Link to="/" className="logo">
          Trobeatraveller
        </Link>
        <div className="hamburger-menu" onClick={toggleNavbar}>
          {isOpen ? <FaTimes className="nav-icon" /> : <FaBars className="nav-icon" />}
        </div>
      </div>

      {isOpen && <div className="navbar-backdrop" onClick={toggleNavbar} />}

      <nav className={`navbar ${isOpen ? "open" : ""}`}>
        <div className="nav-section">
          <NavLink to="/" className="logo desktop-only">
            Trobeatraveller
          </NavLink>

          <h3>Discover</h3>
          <NavLink to="/" className="nav-item">
            <GoHome className="nav-icon" />
            <span>Home</span>
          </NavLink>
          <NavLink to="/explore" className="nav-item">
            <IoSearch className="nav-icon" />
            <span>Explore</span>
          </NavLink>
          <NavLink to="/community" className="nav-item">
            <RiUserCommunityLine className="nav-icon" />
            <span>Community</span>
          </NavLink>
        </div>

        {isAuthenticated && !authLoading && (
          <NavLink to="/create-itinerary" className="nav-create">
            <IoAddOutline className="nav-icon" />
            <span>Create trip</span>
          </NavLink>
        )}

        {authLoading ? (
          <div className="loading-placeholder nav-section">
            <h3>Your space</h3>
            <p>
              <GoBook className="nav-icon" />
              <span>Loading...</span>
            </p>
            <p>
              <GoBook className="nav-icon" />
              <span>Loading...</span>
            </p>
          </div>
        ) : (
          <>
            <div className="nav-section">
              <h3>Your Space</h3>
              {isAuthenticated ? (
                <>
                  <NavLink to="/my-itineraries" className="nav-item">
                    <GoBook className="nav-icon" />
                    <span>My trips</span>
                  </NavLink>
                  <NavLink to="/itineraries/saved" className="nav-item">
                    <IoSaveOutline className="nav-icon" />
                    <span>Saved trips</span>
                  </NavLink>
                  {isOpen && (
                    <>
                      <NavLink
                        to={`/profile/${userMe.id}`}
                        className="nav-item"
                      >
                        <GoPerson className="nav-icon" />
                        <span>Profile</span>
                      </NavLink>
                      <NavLink to="/logout" className="nav-item">
                        <GoSignOut className="nav-icon" />
                        <span>Logout</span>
                      </NavLink>
                    </>
                  )}
                </>
              ) : (
                <>
                  <NavLink to="/login" className="nav-item">
                    <GoSignIn className="nav-icon" />
                    <span>Login</span>
                  </NavLink>
                  <NavLink to="/register" className="nav-item">
                    <GoSignIn className="nav-icon" />
                    <span>Register</span>
                  </NavLink>
                </>
              )}
            </div>
          </>
        )}
      </nav>
    </section>
  );
};

export default Navbar;
