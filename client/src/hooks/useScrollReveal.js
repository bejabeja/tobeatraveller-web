import { useEffect, useRef } from "react";

// Adds `${className}--visible` once the element scrolls into view, then
// stops watching: pairs with a CSS rule like `.foo { opacity: 0; ... }
// &--visible { opacity: 1; ... }`. Factored out of ItineraryCard (the
// original use of this fade/slide-up entrance) so other sections can reuse
// the same scroll-reveal instead of each wiring up their own observer.
export const useScrollReveal = (className, options) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add(`${className}--visible`);
          observer.unobserve(el);
        }
      },
      options ?? { threshold: 0.08, rootMargin: "0px 0px -32px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // Runs once on mount, matching the original ItineraryCard behavior: an
    // `options` object literal passed inline by the caller would otherwise
    // be a new reference every render, tearing the observer down for no
    // reason (it already unobserves itself once revealed anyway).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className]);

  return ref;
};
