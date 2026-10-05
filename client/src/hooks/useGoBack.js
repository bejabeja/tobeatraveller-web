import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// react-router gives the first page of a visit this key: there is nothing of ours behind it,
// so going back would leave the site (someone who arrives from a shared link).
const FIRST_LOCATION_KEY = "default";

export const useGoBack = (fallbackPath) => {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    if (location.key === FIRST_LOCATION_KEY) navigate(fallbackPath, { replace: true });
    else navigate(-1);
  }, [navigate, location.key, fallbackPath]);
};
