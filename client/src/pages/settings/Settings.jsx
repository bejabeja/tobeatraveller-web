import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  IoArrowBackOutline, IoChevronForward, IoCloudDownloadOutline, IoDocumentTextOutline,
  IoNotificationsOutline, IoPersonOutline, IoWarningOutline,
} from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { APP_LANGUAGES, fetchNotificationPreferences, toAppLanguage, updateNotificationPreferences } from "@tobeatraveller/shared";
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

// Every setting that opens or does something: a full-width row with its
// name, an optional line under it, and a chevron. `as` makes it a link.
const SettingsActionRow = ({ as: Component = "button", label, hint, danger = false, ...props }) => (
  <Component
    {...(Component === "button" ? { type: "button" } : {})}
    className={`settings__row settings__row--action${danger ? " settings__row--danger" : ""}`}
    {...props}
  >
    <span className="settings__row-text">
      <span className="settings__row-label">{label}</span>
      {hint && <span className="settings__row-hint">{hint}</span>}
    </span>
    <IoChevronForward className="settings__row-chevron" aria-hidden="true" />
  </Component>
);

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

  const currentLang = toAppLanguage(i18n.language);

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
        <section className="ep__section settings__group">
          <div className="ep__section-heading">
            <IoPersonOutline aria-hidden="true" />
            <h2 className="ep__section-label">{t("settings.account")}</h2>
          </div>
          <div className="settings__rows">
            <div className="settings__row">
              <span className="settings__row-label">{t("auth.emailLabel")}</span>
              <span className="settings__row-value">{userMe?.email}</span>
            </div>
            <label className="settings__row">
              <span className="settings__row-label">{t("settings.language")}</span>
              <select
                className="settings__select"
                value={currentLang}
                onChange={(event) => i18n.changeLanguage(event.target.value)}
              >
                {APP_LANGUAGES.map(({ code, flag, name }) => (
                  <option key={code} value={code}>{flag} {name}</option>
                ))}
              </select>
            </label>
            <SettingsActionRow label={t("editProfile.changePassword")} onClick={() => setShowPasswordModal(true)} />
          </div>
        </section>

        <section className="ep__section settings__group">
          <div className="ep__section-heading">
            <IoNotificationsOutline aria-hidden="true" />
            <h2 className="ep__section-label">{t("settings.notifications")}</h2>
          </div>
          {notificationPreferences && (
            <div className="settings__rows">
              {NOTIFICATION_PREFERENCE_TOGGLES.map(({ key, labelKey }) => (
                <label className="settings__row" key={key}>
                  <span className="settings__row-label">{t(labelKey)}</span>
                  <span className="ep__toggle">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={notificationPreferences[key]}
                      disabled={updatingPreferenceKey === key}
                      onChange={() => handleTogglePreference(key)}
                    />
                    <span className="ep__toggle-slider" />
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="ep__section settings__group">
          <div className="ep__section-heading">
            <IoCloudDownloadOutline aria-hidden="true" />
            <h2 className="ep__section-label">{t("settings.yourData")}</h2>
          </div>
          <div className="settings__rows">
            <SettingsActionRow
              label={isExporting ? t("common.loading") : t("editProfile.downloadData")}
              hint={t("editProfile.yourDataDesc")}
              onClick={handleExportData}
              disabled={isExporting}
            />
          </div>
        </section>

        <section className="ep__section settings__group">
          <div className="ep__section-heading">
            <IoDocumentTextOutline aria-hidden="true" />
            <h2 className="ep__section-label">{t("settings.legal")}</h2>
          </div>
          <div className="settings__rows">
            <SettingsActionRow as={Link} to="/terms" label={t("auth.termsOfService")} />
            <SettingsActionRow as={Link} to="/privacy-policy" label={t("auth.privacyPolicy")} />
            <SettingsActionRow
              label={t("footer.cookiePreferences")}
              onClick={() => window.dispatchEvent(new Event(REOPEN_COOKIE_PREFERENCES_EVENT))}
            />
          </div>
        </section>

        <section className="ep__section settings__group settings__group--danger">
          <div className="ep__section-heading">
            <IoWarningOutline aria-hidden="true" />
            <h2 className="ep__section-label">{t("settings.dangerZone")}</h2>
          </div>
          <div className="settings__rows">
            <SettingsActionRow
              danger
              label={t("editProfile.deleteAccount")}
              hint={t("editProfile.dangerZoneDesc")}
              onClick={() => { setDeleteConfirmInput(""); setShowDeleteModal(true); }}
            />
          </div>
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
