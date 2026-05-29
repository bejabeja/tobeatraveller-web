import { useState } from "react";
import toast from "react-hot-toast";
import { IoArrowBackOutline, IoWarningOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { deleteMyAccount } from "../../services/users";
import { logoutUser } from "../../store/auth/authActions";
import { selectMe } from "../../store/user/userInfoSelectors";
import "../profile/EditProfile.scss";
import "./Settings.scss";

const Settings = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userMe = useSelector(selectMe);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const currentLang = i18n.language?.startsWith("en") ? "en" : "es";

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput !== userMe?.username) return;
    setIsDeleting(true);
    try {
      await deleteMyAccount();
      dispatch(logoutUser());
      navigate("/");
    } catch {
      toast.error(t("errors.deleteAccountFailed"));
      setIsDeleting(false);
    }
  };

  return (
    <div className="ep">
      {/* Sticky header */}
      <header className="ep__header">
        <button type="button" className="ep__back" onClick={() => navigate(-1)} aria-label={t("common.back")}>
          <IoArrowBackOutline />
        </button>
        <h1 className="ep__title">{t("settings.title")}</h1>
        <div style={{ width: 60 }} />
      </header>

      <div className="ep__body">
        {/* Language */}
        <section className="ep__section">
          <p className="ep__section-label">{t("settings.language").toUpperCase()}</p>
          <div className="ep__lang-toggle">
            <button
              type="button"
              className={`ep__lang-btn${currentLang === "es" ? " ep__lang-btn--active" : ""}`}
              onClick={() => i18n.changeLanguage("es")}
            >
              🇪🇸 Español
            </button>
            <button
              type="button"
              className={`ep__lang-btn${currentLang === "en" ? " ep__lang-btn--active" : ""}`}
              onClick={() => i18n.changeLanguage("en")}
            >
              🇬🇧 English
            </button>
          </div>
        </section>

        {/* Your data */}
        <section className="ep__section">
          <p className="ep__section-label">{t("settings.yourData").toUpperCase()}</p>
          <p className="ep__section-desc">{t("editProfile.yourDataDesc")}</p>
          <a href={`${import.meta.env.VITE_API_URL}/users/me/export`} className="ep__link-btn" download>
            {t("editProfile.downloadData")} →
          </a>
        </section>

        {/* Danger zone */}
        <section className="ep__section ep__section--danger">
          <div className="ep__danger-header">
            <IoWarningOutline size={16} aria-hidden="true" />
            <p className="ep__section-label">{t("settings.dangerZone").toUpperCase()}</p>
          </div>
          <p className="ep__section-desc">{t("editProfile.dangerZoneDesc")}</p>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => { setDeleteConfirmInput(""); setShowDeleteModal(true); }}
          >
            {t("editProfile.deleteAccount")}
          </button>
        </section>
      </div>

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="modal__backdrop" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="modal modal--danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{t("editProfile.deleteAccountModal")}</h2>
              <button
                className="modal__close"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                aria-label={t("common.cancel")}
              >
                ✕
              </button>
            </div>
            <p
              className="modal__description"
              dangerouslySetInnerHTML={{ __html: t("editProfile.deleteAccountDesc", { username: userMe?.username }) }}
            />
            <div className="modal__input-wrap">
              <input
                className="ep__delete-input"
                type="text"
                placeholder={userMe?.username}
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal__actions">
              <button
                className="btn btn--ghost modal__btn-cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn btn--danger modal__btn-confirm"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmInput !== userMe?.username || isDeleting}
              >
                {isDeleting ? t("editProfile.deleting") : t("editProfile.deleteAccount")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
