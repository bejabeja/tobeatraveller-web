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

const fields = [
  { name: "username", label: "Username", type: "text" },
  { name: "password", label: "Password", type: "password" },
];

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
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const checkUser = (data) => {
    return dispatch(
      loginUser(data, () => {
        navigate("/");
      })
    );
  };

  return (
    <section className="auth">
      <div className={`auth__bg ${imageAuthLoaded ? "loaded" : ""}`} />

      <form onSubmit={handleSubmit(checkUser)} className="auth__form">
        <h1 className="auth__form-title">Log in</h1>

        {fields.map((field) =>
          field.type === "password" ? (
            <PasswordInputForm
              key={field.name}
              name={field.name}
              label={field.label}
              control={control}
              error={errors[field.name]}
            />
          ) : (
            <InputForm
              key={field.name}
              name={field.name}
              label={field.label}
              control={control}
              type={field.type}
              error={errors[field.name]}
            />
          )
        )}

        <div className="auth__form-error" role="alert" aria-live="assertive">
          {errorInAuth && Object.keys(errors).length === 0
            ? errorInAuth
            : "\u00A0"}
        </div>

        <div className="auth__form-link">
          <SubmitButton label="Log In" loading={isSubmitting} />
          <Link to="/register">Don't have an account? Register!</Link>
        </div>
      </form>
    </section>
  );
};

export default Login;
