import { IoLocateOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import "./InputForm.scss";

const UseCurrentLocationButton = ({ onClick, loading, disabled = false }) => {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            className="use-location-btn"
            onClick={onClick}
            disabled={loading || disabled}
        >
            <IoLocateOutline size={14} className={loading ? "use-location-btn__icon--spinning" : ""} />
            {loading ? t("common.loading") : t("common.useMyLocation")}
        </button>
    );
};

export default UseCurrentLocationButton;
