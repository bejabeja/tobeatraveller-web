import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { IoCameraOutline, IoArrowBackOutline, IoLocationOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { InputForm, TextAreaForm } from "../../components/form/InputForm";
import Modal from "../../components/modal/Modal";
import { checkUsernameAvailable, updateUser } from "../../services/users";
import { initAuthUser } from "../../store/auth/authActions";
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
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
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
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
  }, [avatarPreview]);

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

  const handleAvatarChange = (file) => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveUser = async (data) => {
    try {
      const formData = new FormData();
      formData.append("user", JSON.stringify(data));
      if (avatarFile) formData.append("avatar", avatarFile);
      await updateUser(formData);
      dispatch(initAuthUser());
      dispatch(setUserInfo(id));
      toast.success("Profile updated!");
      navigate(`/profile/${id}`);
    } catch (err) {
      console.error("Error updating profile", err);
      toast.error("Failed to update profile");
      setErrorSubmit(err.message);
    }
  };

  const handleCancel = () => {
    if (isDirty || avatarFile) setShowCancelModal(true);
    else navigate(-1);
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
              onAvatarChange={handleAvatarChange}
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
                <span className={`edit-profile__char-count ${(bioValue?.length || 0) > 140 ? "edit-profile__char-count--warn" : ""}`}>
                  {bioValue?.length || 0}/160
                </span>
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
            <span className={`edit-profile__char-count ${(aboutValue?.length || 0) > 900 ? "edit-profile__char-count--warn" : ""}`}>
              {aboutValue?.length || 0}/1000
            </span>
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

      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => navigate(-1)}
        title="Discard changes?"
        description="You have unsaved changes. Are you sure you want to discard them?"
        confirmText="Discard"
        type="warning"
      />
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

const AvatarSection = ({ userMe, avatarPreview, onAvatarChange }) => {
  const inputRef = useRef(null);
  const preview = avatarPreview || userMe?.avatarUrl || generateAvatar(userMe?.username);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    onAvatarChange(file);
  };

  return (
    <div className="edit-profile__avatar-section">
      <div
        className="edit-profile__avatar-wrapper"
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Change profile photo"
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <img
          className="edit-profile__avatar"
          src={preview}
          alt="Avatar preview"
          onError={(e) => { e.currentTarget.src = generateAvatar(userMe?.username); }}
        />
        <div className="edit-profile__avatar-overlay" aria-hidden="true">
          <IoCameraOutline />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="edit-profile__avatar-input"
          onChange={handleFileChange}
          tabIndex={-1}
        />
      </div>
      <p className={`edit-profile__avatar-hint ${avatarPreview ? "edit-profile__avatar-hint--selected" : ""}`}>
        {avatarPreview ? "✓ New photo selected" : "Click to change"}
      </p>
    </div>
  );
};
