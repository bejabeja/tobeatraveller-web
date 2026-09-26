import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import "./HeroCarousel.scss";

const HeroCarousel = ({ images }) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const slides = images.length > 0 ? images : ["/images/hero.jpg"];

  const goTo = (e, i) => {
    e.stopPropagation();
    setIndex(i);
  };
  const prev = (e) => goTo(e, (index - 1 + slides.length) % slides.length);
  const next = (e) => goTo(e, (index + 1) % slides.length);

  return (
    <div className="hero-carousel">
      {slides.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt=""
          className={`hero-carousel__slide${i === index ? " hero-carousel__slide--active" : ""}`}
        />
      ))}

      {slides.length > 1 && (
        <>
          <button type="button" className="hero-carousel__nav hero-carousel__nav--prev" onClick={prev} aria-label={t("itinerary.previousPhoto")}>
            <MdChevronLeft />
          </button>
          <button type="button" className="hero-carousel__nav hero-carousel__nav--next" onClick={next} aria-label={t("itinerary.nextPhoto")}>
            <MdChevronRight />
          </button>
          <div className="hero-carousel__dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`hero-carousel__dot${i === index ? " hero-carousel__dot--active" : ""}`}
                onClick={(e) => goTo(e, i)}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroCarousel;
