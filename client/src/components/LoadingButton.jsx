import { useTranslation } from "react-i18next";
import "./LoadingButton.scss";

const LoadingButton = ({ isLoading, children, ...props }) => {
  const { t } = useTranslation();

  return (
    <button
      className="btn btn--secondary loading-button"
      disabled={isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? t("common.loading") : children}
    </button>
  );
};

export default LoadingButton;
