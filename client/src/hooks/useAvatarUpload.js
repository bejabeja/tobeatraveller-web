import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

// The same limit the API applies to a profile photo.
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export const useAvatarUpload = () => {
  const { t } = useTranslation();
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
  }, [avatarPreview]);

  const handleAvatarChange = (file) => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t("validation.imageTooLarge"));
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
  };

  const handleUndoRemove = () => setRemoveAvatar(false);

  return {
    avatarFile,
    avatarPreview,
    removeAvatar,
    handleAvatarChange,
    handleRemoveAvatar,
    handleUndoRemove,
  };
};
