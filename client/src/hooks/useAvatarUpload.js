import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export const useAvatarUpload = () => {
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
  }, [avatarPreview]);

  const handleAvatarChange = (file) => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
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
