import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { usernameFromHandle } from "@tobeatraveller/shared";
import Spinner from "../../components/spinner/Spinner";
import { getUserByUsername } from "../../services/users";
import NotFound from "../error/NotFound";
import Profile from "./Profile";

// /@tbat: the profile by name, the address people share and say out loud.
// Any other one-segment address that isn't a page of its own lands here too.
const ProfileByHandle = () => {
  const { t } = useTranslation();
  const { handle } = useParams();
  const username = usernameFromHandle(handle);
  const [found, setFound] = useState({ username: null, id: null, missing: false });

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    getUserByUsername(username)
      .then((user) => { if (!cancelled) setFound({ username, id: user.id, missing: false }); })
      .catch(() => { if (!cancelled) setFound({ username, id: null, missing: true }); });
    return () => { cancelled = true; };
  }, [username]);

  if (!username) return <NotFound />;
  // Still showing the previous name's answer while the new one loads.
  if (found.username !== username) return <Spinner />;
  if (found.missing) return <NotFound message={t("errors.profileNotFound")} />;
  return <Profile id={found.id} />;
};

export default ProfileByHandle;
