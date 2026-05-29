import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { InputForm } from "../../components/form/InputForm";
import { PasswordInputForm } from "../../components/form/PasswordInputForm";
import SubmitButton from "../../components/form/SubmitButton";
import { loginUser, setImageAuthLoaded } from "../../store/auth/authActions";
import {
  selectAuthError,
  selectimageAuthLoaded,
} from "../../store/auth/authSelectors";
import { authImage } from "../../utils/constants/constants";
import { preloadImg } from "../../utils/preloadImg";
import { loginSchema } from "../../utils/schemasValidation";
import "./Auth.scss";

const GUEST_EMAIL = "test.tobeatraveller@gmail.com";
const GUEST_PASSWORD = "testtest";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const imageAuthLoaded = useSelector(selectimageAuthLoaded);
  const errorInAuth = useSelector(selectAuthError);

  useEffect(() => {
    if (imageAuthLoaded) return;
    preloadImg(authImage, () => {
      dispatch(setImageAuthLoaded());
    });
  }, [dispatch, imageAuthLoaded]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const checkUser = (data) =>
    dispatch(loginUser(data, () => navigate("/")));

  const loginAsGuest = () =>
    dispatch(loginUser({ email: GUEST_EMAIL, password: GUEST_PASSWORD }, () => navigate("/")));

  return (
    <section className="auth">
      <div className={`auth__bg ${imageAuthLoaded ? "loaded" : ""}`} />

      <div className={`auth__visual ${imageAuthLoaded ? "auth__visual--loaded" : ""}`}>
        <Link to="/" className="auth__brand">
          <img src="/logo-white.svg" alt="ToBeATraveller" height="28" />
        </Link>
        <div className="auth__tagline">
          <h2>Discover the world,<br />one journey at a time.</h2>
          <p>Join a community of travellers sharing their most inspiring journeys.</p>
        </div>
      </div>

      <div className="auth__panel">
        <form onSubmit={handleSubmit(checkUser)} className="auth__form">
          <Link to="/" className="auth__form-logo">
            <img src="/logo.svg" alt="ToBeATraveller" height="28" />
          </Link>

          <div className="auth__form-header">
            <h1 className="auth__form-title">Welcome back</h1>
            <p className="auth__form-subtitle">Sign in to continue your journey</p>
          </div>

          <InputForm name="email" label="Email" type="email" control={control} error={errors.email} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <PasswordInputForm name="password" label="Password" control={control} error={errors.password} />
            <Link
              to="/forgot-password"
              style={{
                alignSelf: "flex-end",
                fontSize: "0.75rem",
                color: "var(--text-secondary-color)",
                textDecoration: "none",
                marginTop: "0.2rem",
              }}
            >
              Forgot your password?
            </Link>
          </div>

          <div className="auth__form-error" role="alert" aria-live="assertive">
            {errorInAuth && Object.keys(errors).length === 0 ? errorInAuth : " "}
          </div>

          <div className="auth__form-link">
            <SubmitButton label="Log In" loading={isSubmitting} />
            {import.meta.env.VITE_ENV === 'development' && (
              <button type="button" className="auth__form-guest" onClick={loginAsGuest}>
                Continue as guest
              </button>
            )}
            <Link to="/register">New here? <strong>Create an account</strong></Link>
            <Link to="/explore" className="auth__form-browse">
              Explore without an account →
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Login;
