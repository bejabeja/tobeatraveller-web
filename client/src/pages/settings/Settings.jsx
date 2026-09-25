import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  IoArrowBackOutline, IoCloudDownloadOutline, IoDocumentTextOutline, IoGlobeOutline,
  IoLockClosedOutline, IoNotificationsOutline,
} from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { fetchNotificationPreferences, updateNotificationPreferences } from "@tobeatraveller/shared";
import i18n from "../../i18n";
import Spinner from "../../components/spinner/Spinner";
import { REOPEN_COOKIE_PREFERENCES_EVENT } from "../../utils/analytics";
import { changePassword, deleteMyAccount, exportMyData } from "../../services/users";
import { logoutUser } from "../../store/auth/authActions";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { setUserInfo } from "../../store/user/userInfoActions";
import { selectMe, selectMeLoading } from "../../store/user/userInfoSelectors";
import "../../components/modal/Modal.scss";
import "../profile/EditProfile.scss";
import "./Settings.scss";

const NOTIFICATION_PREFERENCE_TOGGLES = [
  { key: "notifyOnComment", labelKey: "settings.notifyOnComment" },
  { key: "notifyOnLike", labelKey: "settings.notifyOnLike" },
  { key: "notifyOnFollow", labelKey: "settings.notifyOnFollow" },
  { key: "notifyOnFriendStamps", labelKey: "settings.notifyOnFriendStamps" },
];

const Settings = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const meDetail = useSelector(selectMe);
  const meLoading = useSelector(selectMeLoading);
  const authUser = useSelector(selectAuthUser);
  const userMe = meDetail ?? authUser;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState(null);
  const [updatingPreferenceKey, setUpdatingPreferenceKey] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const currentLang = i18n.language?.startsWith("en") ? "en" : "es";

  useEffect(() => {
    if (authUser?.id && !meDetail && !meLoading) dispatch(setUserInfo(authUser.id));
  }, [authUser?.id, meDetail, meLoading, dispatch]);

  useEffect(() => {
    fetchNotificationPreferences()
      .then(setNotificationPreferences)
      .catch(() => toast.error(t("errors.notificationPreferencesLoadFailed")));
  }, [t]);

  if (!userMe) return <Spinner />;

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const blob = await exportMyData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tobeatraveller-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("errors.exportDataFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleTogglePreference = async (key) => {
    const previousValue = notificationPreferences[key];
    setUpdatingPreferenceKey(key);
    setNotificationPreferences({ ...notificationPreferences, [key]: !previousValue });
    try {
      const updated = await updateNotificationPreferences({ [key]: !previousValue });
      setNotificationPreferences(updated);
    } catch {
      setNotificationPreferences({ ...notificationPreferences, [key]: previousValue });
      toast.error(t("errors.notificationPreferencesUpdateFailed"));
    } finally {
      setUpdatingPreferenceKey(null);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordError("");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError(t("errors.passwordMin"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError(t("errors.passwordsDontMatch"));
      return;
    }
    setPasswordError("");
    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success(t("editProfile.passwordChanged"));
      closePasswordModal();
    } catch (err) {
      setPasswordError(err.message || t("errors.changePasswordFailed"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput !== userMe?.username) return;
    setIsDeleting(true);
    try {
      await deleteMyAccount();
      dispatch(logoutUser());
      toast.success(t("editProfile.accountDeleted"));
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
        {/* Account */}
        <section className="ep__section">
          <div className="ep__section-heading">
            <IoLockClosedOutline aria-hidden="true" />
            <p className="ep__section-label">{t("settings.account").toUpperCase()}</p>
          </div>
          <p className="ep__section-desc">{userMe?.email}</p>
          <button
            type="button"
            className="ep__link-btn"
            onClick={() => setShowPasswordModal(true)}
          >
            {t("editProfile.changePassword")} →
          </button>
        </section>

        {/* Notifications */}
        <section className="ep__section">
          <div className="ep__section-heading">
            <IoNotificationsOutline aria-hidden="true" />
            <p className="ep__section-label">{t("settings.notifications").toUpperCase()}</p>
          </div>
          {notificationPreferences &&
            NOTIFICATION_PREFERENCE_TOGGLES.map(({ key, labelKey }) => (
              <div className="ep__toggle-row" key={key}>
                <p className="ep__toggle-label">{t(labelKey)}</p>
                <label className="ep__toggle">
                  <input
                    type="checkbox"
                    checked={notificationPreferences[key]}
                    disabled={updatingPreferenceKey === key}
                    onChange={() => handleTogglePreference(key)}
                  />
                  <span className="ep__toggle-slider" />
                </label>
              </div>
            ))}
        </section>

        {/* Language */}
        <section className="ep__section">
          <div className="ep__section-heading">
            <IoGlobeOutline aria-hidden="true" />
            <p className="ep__section-label">{t("settings.language").toUpperCase()}</p>
          </div>
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
          <div className="ep__section-heading">
            <IoCloudDownloadOutline aria-hidden="true" />
            <p className="ep__section-label">{t("settings.yourData").toUpperCase()}</p>
          </div>
          <p className="ep__section-desc">{t("editProfile.yourDataDesc")}</p>
          <button
            type="button"
            className="ep__link-btn"
            onClick={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? t("common.loading") : `${t("editProfile.downloadData")} →`}
          </button>
        </section>

        {/* Legal */}
        <section className="ep__section">
          <div className="ep__section-heading">
            <IoDocumentTextOutline aria-hidden="true" />
            <p className="ep__section-label">{t("settings.legal").toUpperCase()}</p>
          </div>
          <Link to="/terms" className="ep__link-btn">{t("auth.termsOfService")} →</Link>
          <Link to="/privacy-policy" className="ep__link-btn">{t("auth.privacyPolicy")} →</Link>
          <button
            type="button"
            className="ep__link-btn"
            onClick={() => window.dispatchEvent(new Event(REOPEN_COOKIE_PREFERENCES_EVENT))}
          >
            {t("footer.cookiePreferences")} →
          </button>
        </section>

        {/* Danger zone */}
        <section className="ep__section ep__section--danger">
          <div className="ep__danger-header">
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
            <p className="modal__description">
              <Trans i18nKey="editProfile.deleteAccountDesc" values={{ username: userMe?.username }}>
                This will permanently delete your account and all your data. Type <strong>{{ username: userMe?.username }}</strong> to confirm.
              </Trans>
            </p>
            <div className="modal__input-wrap">
              <input
                id="delete-confirm-input"
                className="ep__modal-input"
                type="text"
                aria-label={t("editProfile.deleteAccountConfirmLabel")}
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

      {/* Change password modal */}
      {showPasswordModal && (
        <div className="modal__backdrop" onClick={() => !isChangingPassword && closePasswordModal()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{t("editProfile.changePasswordModal")}</h2>
              <button
                className="modal__close"
                onClick={closePasswordModal}
                disabled={isChangingPassword}
                aria-label={t("common.cancel")}
              >
                ✕
              </button>
            </div>
            <div className="modal__input-wrap">
              <input
                id="current-password-input"
                className="ep__modal-input"
                type="password"
                aria-label={t("editProfile.currentPasswordLabel")}
                placeholder={t("editProfile.currentPasswordLabel")}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal__input-wrap">
              <input
                id="new-password-input"
                className="ep__modal-input"
                type="password"
                aria-label={t("editProfile.newPasswordLabel")}
                placeholder={t("editProfile.newPasswordLabel")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="modal__input-wrap">
              <input
                id="confirm-new-password-input"
                className="ep__modal-input"
                type="password"
                aria-label={t("editProfile.confirmNewPasswordLabel")}
                placeholder={t("editProfile.confirmNewPasswordLabel")}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
            {passwordError && <p className="ep__error">{passwordError}</p>}
            <div className="modal__actions">
              <button
                className="btn btn--ghost modal__btn-cancel"
                onClick={closePasswordModal}
                disabled={isChangingPassword}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn btn--primary modal__btn-confirm"
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword || !confirmNewPassword || isChangingPassword}
              >
                {isChangingPassword ? t("editProfile.changingPassword") : t("editProfile.changePassword")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
