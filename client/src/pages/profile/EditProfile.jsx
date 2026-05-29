import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { IoCameraOutline, IoTrashOutline, IoCheckmarkCircle, IoArrowBackOutline, IoLocationOutline, IoWarningOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { InputForm, TextAreaForm } from "../../components/form/InputForm";
import Modal from "../../components/modal/Modal";
import { useAvatarUpload } from "../../hooks/useAvatarUpload";
import { checkUsernameAvailable, deleteMyAccount, updateUser } from "../../services/users";
import { initAuthUser, logoutUser } from "../../store/auth/authActions";
import { setUserInfo } from "../../store/user/userInfoActions";
import { selectMe } from "../../store/user/userInfoSelectors";
import { generateAvatar } from "../../utils/constants/constants";
import { updateUserSchema } from "../../utils/schemasValidation";
import "./EditProfile.scss";

const EditProfile = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { id } = useParams();
  const userMe = useSelector(selectMe);

  const [errorSubmit, setErrorSubmit] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const { avatarFile, avatarPreview, removeAvatar, handleAvatarChange, handleRemoveAvatar, handleUndoRemove } = useAvatarUpload();
  const navigate = useNavigate();

  const currentLang = i18n.language?.startsWith("en") ? "en" : "es";

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      username: "",
      name: "",
      bio: "",
      location: "",
      about: "",
    },
  });

  const usernameValue = useWatch({ control, name: "username" });
  const bioValue     = useWatch({ control, name: "bio" });
  const aboutValue   = useWatch({ control, name: "about" });

  useEffect(() => {
    dispatch(setUserInfo(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (userMe) {
      reset({
        username: userMe.username ?? "",
        name:     userMe.name     ?? "",
        bio:      userMe.bio      ?? "",
        location: userMe.location ?? "",
        about:    userMe.about    ?? "",
      });
    }
  }, [userMe, reset]);

  useEffect(() => {
    if (!usernameValue || usernameValue.length < 2 || /\s/.test(usernameValue)) {
      setUsernameStatus(null);
      return;
    }
    if (userMe && usernameValue === userMe.username) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(usernameValue);
      if (available === null) { setUsernameStatus(null); return; }
      setUsernameStatus(available ? "available" : "taken");
    }, 500);
    return () => clearTimeout(timer);
  }, [usernameValue, userMe]);

  if (!userMe) return <EditProfileSkeleton />;

  const saveUser = async (data) => {
    try {
      const formData = new FormData();
      formData.append("user", JSON.stringify({ ...data, ...(removeAvatar && { removeAvatar: true }) }));
      if (avatarFile) formData.append("avatar", avatarFile);
      await updateUser(formData);
      toast.success(t("errors.profileUpdated"));
      await Promise.all([dispatch(initAuthUser()), dispatch(setUserInfo(id))]);
      navigate(`/profile/${id}`);
    } catch (err) {
      console.error("Error updating profile", err);
      toast.error(t("errors.updateProfileFailed"));
      setErrorSubmit(err.message);
    }
  };

  const handleCancel = () => {
    if (isDirty || avatarFile || removeAvatar) setShowCancelModal(true);
    else navigate(-1);
  };

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
    <section className="edit-profile section__container">
      <div className="edit-profile__header">
        <button
          type="button"
          className="edit-profile__back"
          onClick={handleCancel}
          aria-label={t("common.back")}
        >
          <IoArrowBackOutline aria-hidden="true" />
        </button>
        <h1 className="edit-profile__title">{t("editProfile.title")}</h1>
      </div>

      <form onSubmit={handleSubmit(saveUser)} className="edit-profile__form">

        <div className="edit-profile__card">
          <div className="edit-profile__banner" />
          <div className="edit-profile__card-body">
            <AvatarSection
              userMe={userMe}
              avatarPreview={avatarPreview}
              removeAvatar={removeAvatar}
              onAvatarChange={handleAvatarChange}
              onRemoveAvatar={handleRemoveAvatar}
              onUndoRemove={handleUndoRemove}
              t={t}
            />
            <div className="edit-profile__fields">
              <InputForm
                name="name"
                label="Name"
                control={control}
                type="text"
                placeholder={t("editProfile.namePlaceholder")}
                error={errors.name}
              />
              <div className="edit-profile__username-wrapper">
                <InputForm
                  name="username"
                  label="Username"
                  control={control}
                  type="text"
                  placeholder={t("editProfile.usernamePlaceholder")}
                  error={errors.username}
                />
                {usernameStatus && (
                  <span
                    className={`edit-profile__username-status edit-profile__username-status--${usernameStatus}`}
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {usernameStatus === "checking"  && t("common.checking")}
                    {usernameStatus === "available" && t("common.available")}
                    {usernameStatus === "taken"     && t("editProfile.alreadyTaken")}
                  </span>
                )}
              </div>
              <div className="edit-profile__field-group">
                <TextAreaForm
                  name="bio"
                  label="Bio"
                  control={control}
                  placeholder={t("editProfile.bioPlaceholder")}
                  error={errors.bio}
                />
                <CharCount value={bioValue} max={160} warnAt={140} />
              </div>
            </div>
          </div>
        </div>

        <div className="edit-profile__card edit-profile__card--padded">
          <div className="edit-profile__section-header">
            <IoLocationOutline aria-hidden="true" />
            <h2 className="edit-profile__section-title">{t("editProfile.locationAbout")}</h2>
          </div>
          <InputForm
            name="location"
            label="Location"
            control={control}
            type="text"
            placeholder={t("editProfile.locationPlaceholder")}
            error={errors.location}
          />
          <div className="edit-profile__field-group">
            <TextAreaForm
              name="about"
              label="About"
              control={control}
              placeholder={t("editProfile.aboutPlaceholder")}
              error={errors.about}
            />
            <CharCount value={aboutValue} max={1000} warnAt={900} />
          </div>
        </div>

        {errorSubmit && (
          <div className="edit-profile__error" role="alert">{errorSubmit}</div>
        )}

        <div className="edit-profile__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleCancel}
          >
            {t("editProfile.cancel")}
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={isSubmitting || usernameStatus === "taken"}
          >
            {isSubmitting ? t("common.saving") : t("editProfile.saveProfile")}
          </button>
        </div>
      </form>

      <div className="edit-profile__data-section">
        <h2 className="edit-profile__data-title">{t("editProfile.yourData")}</h2>
        <p className="edit-profile__data-desc">
          {t("editProfile.yourDataDesc")}
        </p>
        <a
          href={`${import.meta.env.VITE_API_URL}/users/me/export`}
          className="btn btn--secondary"
          download
        >
          {t("editProfile.downloadData")}
        </a>
      </div>

      {/* Language selector */}
      <div className="edit-profile__lang-section">
        <h2>{t("editProfile.language")}</h2>
        <div className="edit-profile__lang-toggle">
          <button
            type="button"
            className={`edit-profile__lang-btn${currentLang === "es" ? " active" : ""}`}
            onClick={() => i18n.changeLanguage("es")}
          >
            🇪🇸 Español
          </button>
          <button
            type="button"
            className={`edit-profile__lang-btn${currentLang === "en" ? " active" : ""}`}
            onClick={() => i18n.changeLanguage("en")}
          >
            🇬🇧 English
          </button>
        </div>
      </div>

      <div className="edit-profile__danger-zone">
        <div className="edit-profile__danger-header">
          <IoWarningOutline size={18} aria-hidden="true" />
          <h2 className="edit-profile__danger-title">{t("editProfile.dangerZone")}</h2>
        </div>
        <p className="edit-profile__danger-desc">
          {t("editProfile.dangerZoneDesc")}
        </p>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => { setDeleteConfirmInput(""); setShowDeleteModal(true); }}
        >
          {t("editProfile.deleteAccount")}
        </button>
      </div>

      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => navigate(-1)}
        title={t("editProfile.discardChanges")}
        description={t("editProfile.discardChangesDesc")}
        confirmText={t("editProfile.discard")}
        type="warning"
      />

      {showDeleteModal && (
        <div className="modal__backdrop">
          <div className="modal">
            <h2>{t("editProfile.deleteAccountModal")}</h2>
            <p dangerouslySetInnerHTML={{
              __html: t("editProfile.deleteAccountDesc", { username: userMe?.username })
            }} />
            <input
              className="edit-profile__delete-input"
              type="text"
              placeholder={userMe?.username}
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              autoFocus
            />
            <div className="modal__actions">
              <button
                className="btn btn--ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn btn--danger"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmInput !== userMe?.username || isDeleting}
              >
                {isDeleting ? t("editProfile.deleting") : t("editProfile.deleteAccount")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default EditProfile;

const EditProfileSkeleton = () => (
  <div className="edit-profile-skeleton section__container">
    <div className="edit-profile-skeleton__header">
      <div className="skeleton edit-profile-skeleton__back" />
      <div className="skeleton edit-profile-skeleton__title" />
    </div>

    <div className="edit-profile-skeleton__card">
      <div className="edit-profile-skeleton__banner" />
      <div className="edit-profile-skeleton__card-body">
        <div className="edit-profile-skeleton__avatar-row">
          <div className="skeleton edit-profile-skeleton__avatar" />
        </div>
        <div className="edit-profile-skeleton__fields">
          <div className="skeleton edit-profile-skeleton__field" />
          <div className="skeleton edit-profile-skeleton__field" />
          <div className="skeleton edit-profile-skeleton__field" />
        </div>
      </div>
    </div>

    <div className="edit-profile-skeleton__card edit-profile-skeleton__card--padded">
      <div className="edit-profile-skeleton__section-header">
        <div className="skeleton edit-profile-skeleton__section-header-icon" />
        <div className="skeleton edit-profile-skeleton__section-header-title" />
      </div>
      <div className="skeleton edit-profile-skeleton__field" />
      <div className="skeleton edit-profile-skeleton__textarea" />
    </div>

    <div className="edit-profile-skeleton__actions">
      <div className="skeleton edit-profile-skeleton__actions-btn edit-profile-skeleton__actions-btn--secondary" />
      <div className="skeleton edit-profile-skeleton__actions-btn edit-profile-skeleton__actions-btn--primary" />
    </div>
  </div>
);

const CharCount = ({ value, max, warnAt }) => (
  <span className={`edit-profile__char-count ${(value?.length || 0) > warnAt ? "edit-profile__char-count--warn" : ""}`}>
    {value?.length || 0}/{max}
  </span>
);

const AvatarSection = ({ userMe, avatarPreview, removeAvatar, onAvatarChange, onRemoveAvatar, onUndoRemove, t }) => {
  const inputRef = useRef(null);
  const hasCloudinaryAvatar = userMe?.avatarUrl?.includes("res.cloudinary.com");
  const preview = avatarPreview || userMe?.avatarUrl || generateAvatar(userMe?.username);
  const wrapperMod = removeAvatar ? "remove" : avatarPreview ? "selected" : "";

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onAvatarChange(file);
  };

  return (
    <div className="edit-profile__avatar-section">
      <div
        className={`edit-profile__avatar-wrapper${wrapperMod ? ` edit-profile__avatar-wrapper--${wrapperMod}` : ""}`}
        onClick={() => !removeAvatar && inputRef.current?.click()}
        role={removeAvatar ? undefined : "button"}
        tabIndex={removeAvatar ? -1 : 0}
        aria-label={removeAvatar ? undefined : "Change profile photo"}
        onKeyDown={(e) => !removeAvatar && e.key === "Enter" && inputRef.current?.click()}
      >
        <img
          className="edit-profile__avatar"
          src={preview}
          alt="Avatar"
          onError={(e) => { e.currentTarget.src = generateAvatar(userMe?.username); }}
        />
        <div className="edit-profile__avatar-overlay" aria-hidden="true">
          {removeAvatar ? <IoTrashOutline /> : <IoCameraOutline />}
        </div>
        {!removeAvatar && (
          <div className="edit-profile__avatar-badge" aria-hidden="true">
            {avatarPreview ? <IoCheckmarkCircle /> : <IoCameraOutline />}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="edit-profile__avatar-input"
          onChange={handleFileChange}
          tabIndex={-1}
        />
      </div>

      {removeAvatar ? (
        <button type="button" className="edit-profile__avatar-remove-btn edit-profile__avatar-remove-btn--undo" onClick={onUndoRemove}>
          <IoArrowBackOutline aria-hidden="true" />
          {t("editProfile.undoRemove")}
        </button>
      ) : (hasCloudinaryAvatar || avatarPreview) ? (
        <button type="button" className="edit-profile__avatar-remove-btn" onClick={onRemoveAvatar}>
          <IoTrashOutline aria-hidden="true" />
          {t("editProfile.removePhoto")}
        </button>
      ) : null}
    </div>
  );
};
