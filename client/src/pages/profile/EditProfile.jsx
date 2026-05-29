import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { IoCameraOutline, IoTrashOutline, IoArrowBackOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { InputForm, TextAreaForm } from "../../components/form/InputForm";
import Modal from "../../components/modal/Modal";
import { useAvatarUpload } from "../../hooks/useAvatarUpload";
import { checkUsernameAvailable, updateUser } from "../../services/users";
import { initAuthUser } from "../../store/auth/authActions";
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
  const navigate = useNavigate();

  const [errorSubmit, setErrorSubmit] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const { avatarFile, avatarPreview, removeAvatar, handleAvatarChange, handleRemoveAvatar, handleUndoRemove } = useAvatarUpload();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { username: "", name: "", bio: "", location: "", about: "" },
  });

  const usernameValue = useWatch({ control, name: "username" });
  const bioValue      = useWatch({ control, name: "bio" });
  const aboutValue    = useWatch({ control, name: "about" });

  useEffect(() => { dispatch(setUserInfo(id)); }, [dispatch, id]);

  useEffect(() => {
    if (userMe) reset({
      username: userMe.username ?? "",
      name:     userMe.name     ?? "",
      bio:      userMe.bio      ?? "",
      location: userMe.location ?? "",
      about:    userMe.about    ?? "",
    });
  }, [userMe, reset]);

  useEffect(() => {
    if (!usernameValue || usernameValue.length < 2 || /\s/.test(usernameValue)) { setUsernameStatus(null); return; }
    if (userMe && usernameValue === userMe.username) { setUsernameStatus(null); return; }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(usernameValue);
      if (available === null) { setUsernameStatus(null); return; }
      setUsernameStatus(available ? "available" : "taken");
    }, 500);
    return () => clearTimeout(timer);
  }, [usernameValue, userMe]);

  if (!userMe) return <EditProfileSkeleton />;

  const hasChanges = isDirty || !!avatarFile || removeAvatar;

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
      toast.error(t("errors.updateProfileFailed"));
      setErrorSubmit(err.message);
    }
  };

  const handleCancel = () => {
    if (hasChanges) setShowCancelModal(true);
    else navigate(-1);
  };

  return (
    <div className="ep">
      {/* Sticky header */}
      <header className="ep__header">
        <button type="button" className="ep__back" onClick={handleCancel} aria-label={t("common.back")}>
          <IoArrowBackOutline />
        </button>
        <h1 className="ep__title">{t("editProfile.title")}</h1>
        <button
          type="button"
          className={`ep__save${hasChanges ? " ep__save--active" : ""}`}
          onClick={handleSubmit(saveUser)}
          disabled={isSubmitting || usernameStatus === "taken" || !hasChanges}
        >
          {isSubmitting ? t("common.saving") : t("editProfile.saveProfile")}
        </button>
      </header>

      <div className="ep__body">
        {/* Avatar */}
        <div className="ep__avatar-section">
          <AvatarEditor
            userMe={userMe}
            avatarPreview={avatarPreview}
            removeAvatar={removeAvatar}
            onAvatarChange={handleAvatarChange}
            onRemoveAvatar={handleRemoveAvatar}
            onUndoRemove={handleUndoRemove}
            t={t}
          />
        </div>

        <form onSubmit={handleSubmit(saveUser)}>
          {/* Basic info */}
          <section className="ep__section">
            <p className="ep__section-label">{t("editProfile.basicInfo").toUpperCase()}</p>
            <div className="ep__fields">
              <InputForm name="name" label="Name" control={control} type="text"
                placeholder={t("editProfile.namePlaceholder")} error={errors.name} />
              <div className="ep__username-wrap">
                <InputForm name="username" label="Username" control={control} type="text"
                  placeholder={t("editProfile.usernamePlaceholder")} error={errors.username} />
                {usernameStatus && (
                  <span className={`ep__username-status ep__username-status--${usernameStatus}`} aria-live="polite">
                    {usernameStatus === "checking"  && t("common.checking")}
                    {usernameStatus === "available" && t("common.available")}
                    {usernameStatus === "taken"     && t("editProfile.alreadyTaken")}
                  </span>
                )}
              </div>
              <div className="ep__field-with-count">
                <TextAreaForm name="bio" label="Bio" control={control}
                  placeholder={t("editProfile.bioPlaceholder")} error={errors.bio} />
                <CharCount value={bioValue} max={160} warnAt={140} />
              </div>
            </div>
          </section>

          {/* Location & About */}
          <section className="ep__section">
            <p className="ep__section-label">{t("editProfile.locationAbout").toUpperCase()}</p>
            <div className="ep__fields">
              <InputForm name="location" label="Location" control={control} type="text"
                placeholder={t("editProfile.locationPlaceholder")} error={errors.location} />
              <div className="ep__field-with-count">
                <TextAreaForm name="about" label="About" control={control}
                  placeholder={t("editProfile.aboutPlaceholder")} error={errors.about} />
                <CharCount value={aboutValue} max={1000} warnAt={900} />
              </div>
            </div>
          </section>

          {errorSubmit && <p className="ep__error" role="alert">{errorSubmit}</p>}
        </form>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => navigate(-1)}
        title={t("editProfile.discardChanges")}
        description={t("editProfile.discardChangesDesc")}
        confirmText={t("editProfile.discard")}
        cancelText={t("editProfile.keepEditing")}
        type="warning"
      />
    </div>
  );
};

export default EditProfile;

// ── Sub-components ─────────────────────────────────────────────────────────────

const AvatarEditor = ({ userMe, avatarPreview, removeAvatar, onAvatarChange, onRemoveAvatar, onUndoRemove, t }) => {
  const inputRef = useRef(null);
  const hasCloudinaryAvatar = userMe?.avatarUrl?.includes("res.cloudinary.com");
  const preview = avatarPreview || userMe?.avatarUrl || generateAvatar(userMe?.username);

  return (
    <div className="ep__avatar-editor">
      <div className={`ep__avatar-wrap${removeAvatar ? " ep__avatar-wrap--remove" : ""}`}
        onClick={() => !removeAvatar && inputRef.current?.click()}
        role={removeAvatar ? undefined : "button"} tabIndex={removeAvatar ? -1 : 0}
        onKeyDown={(e) => !removeAvatar && e.key === "Enter" && inputRef.current?.click()}>
        <img className="ep__avatar-img" src={preview} alt="Avatar"
          onError={(e) => { e.currentTarget.src = generateAvatar(userMe?.username); }} />
        <div className="ep__avatar-overlay" aria-hidden="true">
          {removeAvatar ? <IoTrashOutline /> : <IoCameraOutline />}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="ep__avatar-input"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarChange(f); }} tabIndex={-1} />
      </div>

      {removeAvatar ? (
        <button type="button" className="ep__avatar-action" onClick={onUndoRemove}>
          {t("editProfile.undoRemove")}
        </button>
      ) : (hasCloudinaryAvatar || avatarPreview) ? (
        <button type="button" className="ep__avatar-action ep__avatar-action--remove" onClick={onRemoveAvatar}>
          {t("editProfile.removePhoto")}
        </button>
      ) : (
        <button type="button" className="ep__avatar-action" onClick={() => inputRef.current?.click()}>
          {t("editProfile.basicInfo")}
        </button>
      )}
    </div>
  );
};

const CharCount = ({ value, max, warnAt }) => (
  <span className={`ep__char-count${(value?.length || 0) > warnAt ? " ep__char-count--warn" : ""}`}>
    {value?.length || 0}/{max}
  </span>
);

const EditProfileSkeleton = () => (
  <div className="ep">
    <header className="ep__header">
      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%" }} />
      <div className="skeleton" style={{ width: 120, height: 20, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: 60, height: 32, borderRadius: 999 }} />
    </header>
    <div className="ep__body">
      <div className="ep__avatar-section" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
        <div className="skeleton" style={{ width: 88, height: 88, borderRadius: "50%" }} />
      </div>
      <section className="ep__section">
        <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 4, marginBottom: "0.75rem" }} />
        <div className="ep__fields">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />)}
        </div>
      </section>
    </div>
  </div>
);
