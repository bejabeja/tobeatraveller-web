import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { blockUser, getBlockStatus, unblockUser } from "../services/blocks";
import { setUserInfo, setUserInfoFollowing } from "../store/user/userInfoActions";
import { selectMe } from "../store/user/userInfoSelectors";

// Whether the viewer has blocked a person, and blocking or unblocking them. Blocking also
// ends any follow between the two, so the viewer's own followed list is read again.
export const useBlock = (targetUserId, enabled, username) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const userMe = useSelector(selectMe);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isLoadingBlock, setIsLoadingBlock] = useState(false);

    useEffect(() => {
        setIsBlocked(false);
        if (!enabled || !targetUserId) return undefined;
        let cancelled = false;
        getBlockStatus(targetUserId)
            .then(({ blocked }) => { if (!cancelled) setIsBlocked(blocked); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [enabled, targetUserId]);

    const toggleBlock = async () => {
        if (isLoadingBlock) return;
        const requestedTargetId = targetUserId;
        const wasBlocked = isBlocked;
        setIsLoadingBlock(true);
        try {
            if (wasBlocked) await unblockUser(requestedTargetId);
            else await blockUser(requestedTargetId);
            setIsBlocked(!wasBlocked);
            toast.success(t(wasBlocked ? "block.unblocked" : "block.blocked", { username }));
            if (userMe?.id) {
                dispatch(setUserInfo(userMe.id));
                dispatch(setUserInfoFollowing(userMe.id));
            }
        } catch {
            toast.error(t("block.error"));
        } finally {
            setIsLoadingBlock(false);
        }
    };

    return { isBlocked, isLoadingBlock, toggleBlock };
};
