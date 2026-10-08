import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { IoBanOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getBlockedUsers, unblockUser } from "../../services/blocks";
import { generateAvatar } from "../../utils/constants/constants";

const BlockedPeopleSection = () => {
  const { t } = useTranslation();
  const [blockedUsers, setBlockedUsers] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getBlockedUsers()
      .then((users) => { if (!cancelled) setBlockedUsers(users); })
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const handleUnblock = async (user) => {
    setUnblockingId(user.id);
    try {
      await unblockUser(user.id);
      setBlockedUsers((previous) => previous.filter((blocked) => blocked.id !== user.id));
      toast.success(t("block.unblocked", { username: user.username }));
    } catch {
      toast.error(t("block.error"));
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <section className="ep__section settings__group">
      <div className="ep__section-heading">
        <IoBanOutline aria-hidden="true" />
        <h2 className="ep__section-label">{t("settings.blockedPeople")}</h2>
      </div>
      {loadFailed && <p className="settings__hint" role="alert">{t("block.listError")}</p>}
      {!loadFailed && blockedUsers?.length === 0 && <p className="settings__hint">{t("settings.blockedPeopleEmpty")}</p>}
      {blockedUsers?.length > 0 && (
        <div className="settings__rows">
          {blockedUsers.map((user) => (
            <div key={user.id} className="settings__row">
              <Link to={`/profile/${user.id}`} className="settings__blocked-user">
                <img
                  className="settings__blocked-avatar"
                  src={user.avatarUrl || generateAvatar(user.username)}
                  alt=""
                  onError={(event) => { event.currentTarget.src = generateAvatar(user.username); }}
                />
                <span className="settings__row-label">@{user.username}</span>
              </Link>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => handleUnblock(user)}
                disabled={unblockingId === user.id}
              >
                {t("block.unblockButton")}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default BlockedPeopleSection;
