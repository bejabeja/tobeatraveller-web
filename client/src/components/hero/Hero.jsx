import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setImageHeroLoaded } from "../../store/auth/authActions";
import {
  selectAuthUser,
  selectIsAuthenticated,
  selectimageHeroLoaded,
} from "../../store/auth/authSelectors";
import { selectMe } from "../../store/user/userInfoSelectors";
import { heroImage } from "../../utils/constants/constants";
import { preloadImg } from "../../utils/preloadImg";
import NextTrip from "./NextTrip";
import "./Hero.scss";

const Hero = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const imageHeroLoaded = useSelector(selectimageHeroLoaded);
  const userMe = useSelector(selectMe);
  // The session's user is there from the start; the full profile comes a
  // moment later, and until then the greeting read "Hello, !".
  const authUser = useSelector(selectAuthUser);

  useEffect(() => {
    if (imageHeroLoaded) return;
    preloadImg(heroImage, () => {
      dispatch(setImageHeroLoaded());
    });
  }, [dispatch, imageHeroLoaded]);

  return (
    <section className={`hero${imageHeroLoaded ? " loaded" : ""}${isAuthenticated ? " hero--compact" : ""}`}>
      <div className="hero__overlay" />
      <div className="hero__content">
        {isAuthenticated ? (
          // A returning, logged-in user has already been sold on the app;
          // repeating the same pitch every time they open Home read as if
          // the app didn't recognize them, so they get a greeting and their
          // own next trip instead of the marketing copy shown to visitors.
          <>
            <h1 className="hero__content__title">
              {t("home.heroGreeting", { username: userMe?.username ?? authUser?.username })}
            </h1>
            <NextTrip />
          </>
        ) : (
          <>
            <h1 className="hero__content__title">{t("home.heroTitle")}</h1>
            <p className="hero__content__description">{t("home.heroSubtitle")}</p>
            <div className="hero__content__buttons">
              <Link to="/register" className="btn btn--primary">
                {t("home.heroJoinNow")}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Hero;
