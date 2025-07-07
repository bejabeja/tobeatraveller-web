import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { setImageHeroLoaded } from "../../store/auth/authActions";
import {
  selectIsAuthenticated,
  selectimageHeroLoaded,
} from "../../store/auth/authSelectors";
import { heroImage } from "../../utils/constants/constants";
import { preloadImg } from "../../utils/preloadImg";
import "./Hero.scss";

const Hero = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const imageHeroLoaded = useSelector(selectimageHeroLoaded);

  useEffect(() => {
    if (imageHeroLoaded) return;
    preloadImg(heroImage, () => {
      dispatch(setImageHeroLoaded());
    });
  }, [dispatch, imageHeroLoaded]);

  return (
    <section className={`hero ${imageHeroLoaded ? "loaded" : ""}`}>
      <div className="hero__overlay" />
      <div className="hero__content">
        <h1 className="hero__content__title">Connect with Your World</h1>
        <p className="hero__content__description">
          Share moments, build connections, and discover amazing stories from
          people around the globe.
        </p>
        {!isAuthenticated && (
          <div className="hero__content__buttons">
            <Link to="/register" className="btn btn__secondary">
              Join Now
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
