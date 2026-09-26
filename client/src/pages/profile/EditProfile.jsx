import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { IoCameraOutline, IoTrashOutline, IoArrowBackOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDate, profilePath } from "@tobeatraveller/shared";
import { InputForm, TextAreaForm } from "../../components/form/InputForm";
import UseCurrentLocationButton from "../../components/form/UseCurrentLocationButton";
import Modal from "../../components/modal/Modal";
import { useAvatarUpload } from "../../hooks/useAvatarUpload";
import { useCurrentLocation } from "../../hooks/useCurrentLocation";
import { useGeocodeSearch } from "../../hooks/useGeocodeSearch";
import { checkUsernameAvailable, updateUser } from "../../services/users";
import { initAuthUser } from "../../store/auth/authActions";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { setUserInfo } from "../../store/user/userInfoActions";
import { selectMe } from "../../store/user/userInfoSelectors";
import { generateAvatar } from "../../utils/constants/constants";
import { updateUserSchema } from "../../utils/schemasValidation";
import "./EditProfile.scss";

// The API's answer when the name changed less than 30 days ago (e.g. from
// another tab, where the field wasn't locked yet).
const USERNAME_COOLDOWN_ERROR = "The username can only be changed";

// Counters show once a field is this full, not on every short field.
const COUNTER_FROM = 0.85;

const EditProfile = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { id } = useParams();
  const userMe = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const navigate = useNavigate();

  const [errorSubmit, setErrorSubmit] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const { avatarFile, avatarPreview, removeAvatar, handleAvatarChange, handleRemoveAvatar, handleUndoRemove } = useAvatarUpload();
  const { reverseGeocode } = useGeocodeSearch();
  const { getCurrentLocation, loading: locating } = useCurrentLocation();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { username: "", name: "", bio: "", location: "", about: "" },
  });

  const handleUseCurrentLocation = async () => {
    let coords;
    try {
      coords = await getCurrentLocation();
    } catch {
      toast.error(t("common.locationPermissionDeniedToast"));
      return;
    }
    try {
      const place = await reverseGeocode(coords);
      if (place) setValue("location", place.label, { shouldDirty: true, shouldValidate: true });
      else toast.error(t("common.locationErrorToast"));
    } catch {
      toast.error(t("common.locationErrorToast"));
    }
  };

  const usernameValue = useWatch({ control, name: "username" });

  useEffect(() => {
    if (authUser && String(authUser.id) !== String(id)) {
      navigate(`/profile/edit/${authUser.id}`, { replace: true });
      return;
    }
    dispatch(setUserInfo(id));
  }, [dispatch, id, authUser, navigate]);

  useEffect(() => {
    if (userMe) reset({
      username: userMe.username ?? "",
      name:     userMe.name     ?? "",
      bio:      userMe.bio      ?? "",
      location: userMe.location ?? "",
      about:    userMe.about    ?? "",
    });
  }, [userMe, reset]);

  const latestUsernameRef = useRef("");

  useEffect(() => {
    if (!usernameValue || usernameValue.length < 2 || /\s/.test(usernameValue)) { setUsernameStatus(null); return; }
    if (userMe && usernameValue === userMe.username) { setUsernameStatus(null); return; }
    setUsernameStatus("checking");
    const requestedUsername = usernameValue;
    latestUsernameRef.current = requestedUsername;
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(requestedUsername);
      if (latestUsernameRef.current !== requestedUsername) return;
      if (available === null) { setUsernameStatus(null); return; }
      setUsernameStatus(available ? "available" : "taken");
    }, 500);
    return () => clearTimeout(timer);
  }, [usernameValue, userMe]);

  if (!userMe) return <EditProfileSkeleton />;

  const hasChanges = isDirty || !!avatarFile || removeAvatar;
  // Changed less than 30 days ago: locked until then (the API refuses it too).
  const usernameLockedUntil = userMe.usernameChangeAvailableAt;
  const usernameEdited = !usernameLockedUntil && usernameValue && usernameValue.toLowerCase() !== userMe.username?.toLowerCase();

  const saveUser = async (data) => {
    setErrorSubmit(null);
    try {
      const formData = new FormData();
      formData.append("user", JSON.stringify({ ...data, ...(removeAvatar && { removeAvatar: true }) }));
      if (avatarFile) formData.append("avatar", avatarFile);
      await updateUser(formData);
      toast.success(t("errors.profileUpdated"));
      await Promise.all([dispatch(initAuthUser()), dispatch(setUserInfo(id))]);
      navigate(`/profile/${id}`);
    } catch (err) {
      if (err.field && err.field in updateUserSchema.shape) {
        const message = err.message?.startsWith(USERNAME_COOLDOWN_ERROR) ? t("editProfile.usernameChangeLimit") : err.message;
        setError(err.field, { type: "server", message });
        document.getElementById(err.field)?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById(err.field)?.focus();
      } else {
        toast.error(err.message || t("errors.updateProfileFailed"));
        setErrorSubmit(err.message);
      }
    }
  };

  const handleCancel = () => {
    if (hasChanges) setShowCancelModal(true);
    else navigate(-1);
  };

  const saveDisabled = isSubmitting || usernameStatus === "taken" || usernameStatus === "checking" || !hasChanges;
  const saveLabel = isSubmitting ? t("common.saving") : t("editProfile.saveProfile");
  const profileAddress = `${window.location.host}${profilePath(usernameValue || userMe.username)}`;

  return (
    <div className="ep">
      <header className="ep__header">
        <button type="button" className="ep__back" onClick={handleCancel} aria-label={t("common.back")}>
          <IoArrowBackOutline />
        </button>
        <h1 className="ep__title">{t("editProfile.title")}</h1>
        <button type="button" className="btn btn--primary ep__save" onClick={handleSubmit(saveUser)} disabled={saveDisabled}>
          {saveLabel}
        </button>
      </header>

      <form className="ep__body" onSubmit={handleSubmit(saveUser)}>
        <section className="ep__section" aria-labelledby="ep-profile">
          <h2 id="ep-profile" className="ep__section-title">{t("editProfile.sectionProfile")}</h2>
          <AvatarEditor
            userMe={userMe}
            avatarPreview={avatarPreview}
            removeAvatar={removeAvatar}
            onAvatarChange={handleAvatarChange}
            onRemoveAvatar={handleRemoveAvatar}
            onUndoRemove={handleUndoRemove}
            t={t}
          />
          <InputForm name="name" label={t("editProfile.nameLabel")} control={control} type="text"
            placeholder={t("editProfile.namePlaceholder")} error={errors.name} maxLength={50} counterFrom={COUNTER_FROM} />
          <div className="ep__username">
            <InputForm name="username" label={t("editProfile.usernameLabel")} control={control} type="text"
              placeholder={t("editProfile.usernamePlaceholder")} error={errors.username} maxLength={50} counterFrom={COUNTER_FROM}
              inputProps={{ disabled: Boolean(usernameLockedUntil), autoCapitalize: "none", spellCheck: false }}
              right={usernameStatus && (
                <span className={`ep__username-status ep__username-status--${usernameStatus}`} aria-live="polite">
                  {usernameStatus === "checking"  && t("common.checking")}
                  {usernameStatus === "available" && t("common.available")}
                  {usernameStatus === "taken"     && t("editProfile.alreadyTaken")}
                </span>
              )} />
            {/* The name is the profile's address (and invite code): shown as it will be. */}
            <p className="ep__field-hint">{t("editProfile.usernameAddress", { address: profileAddress })}</p>
            {usernameLockedUntil && (
              <p className="ep__field-hint">
                {t("editProfile.usernameLockedUntil", { date: formatDate(usernameLockedUntil, i18n.language, { day: "numeric", month: "long", year: "numeric" }) })}
              </p>
            )}
            {/* Before saving, not after: the old address stops working. */}
            {usernameEdited && <p className="ep__field-hint ep__field-hint--warning">{t("editProfile.usernameChangeLimit")}</p>}
          </div>
          <div>
            <InputForm name="location" label={t("editProfile.locationLabel")} control={control} type="text"
              placeholder={t("editProfile.locationPlaceholder")} error={errors.location} maxLength={50} showCounter={false} />
            <UseCurrentLocationButton onClick={handleUseCurrentLocation} loading={locating} />
          </div>
        </section>

        <section className="ep__section" aria-labelledby="ep-about">
          <h2 id="ep-about" className="ep__section-title">{t("editProfile.sectionAbout")}</h2>
          <div>
            <TextAreaForm name="bio" label={t("editProfile.bioLabel")} control={control}
              placeholder={t("editProfile.bioPlaceholder")} error={errors.bio} maxLength={160} counterFrom={COUNTER_FROM} />
            <p className="ep__field-hint">{t("editProfile.bioHint")}</p>
          </div>
          <div>
            <TextAreaForm name="about" label={t("editProfile.aboutLabel")} control={control}
              placeholder={t("editProfile.aboutPlaceholder")} error={errors.about} maxLength={1000} counterFrom={COUNTER_FROM} />
            <p className="ep__field-hint">{t("editProfile.aboutHint")}</p>
          </div>
        </section>

        {errorSubmit && <p className="ep__error" role="alert">{errorSubmit}</p>}

        {/* Also at the end, where you finish: the header one is far on a laptop. */}
        <div className="ep__actions">
          <button type="button" className="btn btn--secondary" onClick={handleCancel}>{t("editProfile.cancel")}</button>
          <button type="submit" className="btn btn--primary" disabled={saveDisabled}>{saveLabel}</button>
        </div>
      </form>

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
  const hasPhoto = Boolean(avatarPreview) || Boolean(userMe?.avatarUrl?.includes("res.cloudinary.com"));
  const preview = avatarPreview || userMe?.avatarUrl || generateAvatar(userMe?.username);
  const pickPhoto = () => inputRef.current?.click();

  return (
    <div className="ep__avatar-editor">
      {/* A shortcut for the pointer; the button beside it is the one for the
          keyboard and screen readers, so they don't meet the same action twice. */}
      <button type="button" className={`ep__avatar-wrap${removeAvatar ? " ep__avatar-wrap--remove" : ""}`}
        onClick={pickPhoto} disabled={removeAvatar} tabIndex={-1} aria-hidden="true">
        <img className="ep__avatar-img" src={preview} alt=""
          onError={(e) => { e.currentTarget.src = generateAvatar(userMe?.username); }} />
        <span className="ep__avatar-badge" aria-hidden="true">
          {removeAvatar ? <IoTrashOutline /> : <IoCameraOutline />}
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="ep__avatar-input"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarChange(f); }} tabIndex={-1} />

      <div className="ep__avatar-actions">
        {removeAvatar ? (
          <button type="button" className="btn btn--secondary ep__avatar-action" onClick={onUndoRemove}>
            {t("editProfile.undoRemove")}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--secondary ep__avatar-action" onClick={pickPhoto}>
              {hasPhoto ? t("editProfile.changePhoto") : t("editProfile.addPhoto")}
            </button>
            {hasPhoto && (
              <button type="button" className="ep__avatar-remove" onClick={onRemoveAvatar}>
                {t("editProfile.removePhoto")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const EditProfileSkeleton = () => (
  <div className="ep">
    <header className="ep__header">
      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%" }} />
      <div className="skeleton" style={{ width: 120, height: 20, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: 90, height: 34, borderRadius: 999 }} />
    </header>
    <div className="ep__body">
      <section className="ep__section">
        <div className="skeleton" style={{ width: 80, height: 16, borderRadius: 4 }} />
        <div className="ep__avatar-editor">
          <div className="skeleton" style={{ width: 88, height: 88, borderRadius: "50%" }} />
          <div className="skeleton" style={{ width: 120, height: 34, borderRadius: 999 }} />
        </div>
        {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />)}
      </section>
    </div>
  </div>
);
