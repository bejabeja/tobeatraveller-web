import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { IoEarth } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { InputForm } from "../../components/form/InputForm";
import { PasswordInputForm } from "../../components/form/PasswordInputForm";
import SubmitButton from "../../components/form/SubmitButton";
import { createUser, setImageAuthLoaded } from "../../store/auth/authActions";
import {
  selectAuthError,
  selectimageAuthLoaded,
} from "../../store/auth/authSelectors";
import { authImage } from "../../utils/constants/constants";
import { preloadImg } from "../../utils/preloadImg";
import { signupSchema } from "../../utils/schemasValidation";
import "./Auth.scss";

const Signup = () => {
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
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const addUser = (data) =>
    dispatch(createUser(data, () => navigate("/")));

  return (
    <section className="auth">
      <div className={`auth__bg ${imageAuthLoaded ? "loaded" : ""}`} />

      <div className={`auth__visual ${imageAuthLoaded ? "auth__visual--loaded" : ""}`}>
        <Link to="/" className="auth__brand">
          <IoEarth /><span>Tobeatraveller</span>
        </Link>
        <div className="auth__tagline">
          <h2>Your journey starts here.</h2>
          <p>Create your account and start sharing your adventures with travellers around the world.</p>
        </div>
      </div>

      <div className="auth__panel">
        <form
          onSubmit={handleSubmit(addUser)}
          className="auth__form"
          aria-labelledby="signup-form-title"
        >
          <Link to="/" className="auth__form-logo">
            <IoEarth />Tobeatraveller
          </Link>

          <div className="auth__form-header">
            <h1 id="signup-form-title" className="auth__form-title">Create account</h1>
            <p className="auth__form-subtitle">Join the community of travellers</p>
          </div>

          <InputForm name="email" label="Email" type="email" control={control} error={errors.email} />
          <InputForm name="username" label="Username" type="text" control={control} error={errors.username} />
          <PasswordInputForm name="password" label="Password" control={control} error={errors.password} />
          <PasswordInputForm name="confirmPassword" label="Confirm password" control={control} error={errors.confirmPassword} />

          <div className="auth__form-error">
            {errorInAuth && Object.keys(errors).length === 0 ? errorInAuth : " "}
          </div>

          <div className="auth__form-link">
            <SubmitButton label="Create account" loading={isSubmitting} />
            <Link to="/login">Already have an account? <strong>Sign in</strong></Link>
            <Link to="/explore" className="auth__form-browse">
              Explore without an account →
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Signup;
