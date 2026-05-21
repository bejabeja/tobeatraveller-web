import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { IoCameraOutline, IoTrashOutline, IoCheckmarkCircle, IoArrowBackOutline, IoLocationOutline, IoWarningOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
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
      toast.success("Profile updated!");
      await Promise.all([dispatch(initAuthUser()), dispatch(setUserInfo(id))]);
      navigate(`/profile/${id}`);
    } catch (err) {
      console.error("Error updating profile", err);
      toast.error("Failed to update profile");
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
      toast.error("Failed to delete account. Please try again.");
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
          aria-label="Go back"
        >
          <IoArrowBackOutline aria-hidden="true" />
        </button>
        <h1 className="edit-profile__title">Edit profile</h1>
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
            />
            <div className="edit-profile__fields">
              <InputForm
                name="name"
                label="Name"
                control={control}
                type="text"
                placeholder="Your display name"
                error={errors.name}
              />
              <div className="edit-profile__username-wrapper">
                <InputForm
                  name="username"
                  label="Username"
                  control={control}
                  type="text"
                  placeholder="your_username"
                  error={errors.username}
                />
                {usernameStatus && (
                  <span
                    className={`edit-profile__username-status edit-profile__username-status--${usernameStatus}`}
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {usernameStatus === "checking"  && "…"}
                    {usernameStatus === "available" && "✓ Available"}
                    {usernameStatus === "taken"     && "✗ Already taken"}
                  </span>
                )}
              </div>
              <div className="edit-profile__field-group">
                <TextAreaForm
                  name="bio"
                  label="Bio"
                  control={control}
                  placeholder="A short description of yourself…"
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
            <h2 className="edit-profile__section-title">Location & About</h2>
          </div>
          <InputForm
            name="location"
            label="Location"
            control={control}
            type="text"
            placeholder="City, Country"
            error={errors.location}
          />
          <div className="edit-profile__field-group">
            <TextAreaForm
              name="about"
              label="About"
              control={control}
              placeholder="Tell the community about yourself and your travel style…"
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
            className="btn btn__primary-outline"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn__primary"
            disabled={isSubmitting || usernameStatus === "taken"}
          >
            {isSubmitting ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>

      <div className="edit-profile__danger-zone">
        <div className="edit-profile__danger-header">
          <IoWarningOutline size={18} aria-hidden="true" />
          <h2 className="edit-profile__danger-title">Danger zone</h2>
        </div>
        <p className="edit-profile__danger-desc">
          Once you delete your account, all your data — itineraries, likes, and followers — will be permanently removed. This action cannot be undone.
        </p>
        <button
          type="button"
          className="btn btn__danger-outline"
          onClick={() => { setDeleteConfirmInput(""); setShowDeleteModal(true); }}
        >
          Delete my account
        </button>
      </div>

      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => navigate(-1)}
        title="Discard changes?"
        description="You have unsaved changes. Are you sure you want to discard them?"
        confirmText="Discard"
        type="warning"
      />

      {showDeleteModal && (
        <div className="modal__backdrop">
          <div className="modal">
            <h2>Delete account?</h2>
            <p>
              This will permanently delete your account and all your data.
              Type <strong>{userMe?.username}</strong> to confirm.
            </p>
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
                className="btn btn__secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn__danger"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmInput !== userMe?.username || isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete account"}
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

const AvatarSection = ({ userMe, avatarPreview, removeAvatar, onAvatarChange, onRemoveAvatar, onUndoRemove }) => {
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
          Undo remove
        </button>
      ) : (hasCloudinaryAvatar || avatarPreview) ? (
        <button type="button" className="edit-profile__avatar-remove-btn" onClick={onRemoveAvatar}>
          <IoTrashOutline aria-hidden="true" />
          Remove photo
        </button>
      ) : null}
    </div>
  );
};
