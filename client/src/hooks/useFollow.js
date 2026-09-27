import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from 'react-router-dom';
import { followUser, unfollowUser } from "../services/followers";
import { selectIsAuthenticated } from "../store/auth/authSelectors";
import { setUserInfo, setUserInfoFollowing } from "../store/user/userInfoActions";
import { selectMe } from "../store/user/userInfoSelectors";
import { trackEvent } from "../utils/analytics";
import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";

export const useFollow = (targetUserId) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate()
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const userMe = useSelector(selectMe);

    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoadingFollow, setIsLoadingFollow] = useState(false);

    const isMyUser = targetUserId === userMe?.id;

    // Tracks the current profile being viewed, so a toggleFollow request that resolves
    // after the user has already navigated to a different profile doesn't write its
    // result into this now-reused hook instance's state.
    const targetUserIdRef = useRef(targetUserId);
    useEffect(() => {
        targetUserIdRef.current = targetUserId;
        setIsLoadingFollow(false);
    }, [targetUserId]);

    useEffect(() => {
        const checkFollowing = () => {
            const following = userMe?.followingListIds?.some((u) => u.id === targetUserId);
            setIsFollowing(!!following);
        };
        checkFollowing();
    }, [userMe, targetUserId]);

    const toggleFollow = async () => {
        if (!isAuthenticated) {
            navigate('/login')
            return;
        }
        if (isLoadingFollow) return;

        const requestedTargetId = targetUserId;
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        setIsLoadingFollow(true);
        try {
            if (wasFollowing) {
                await unfollowUser(requestedTargetId);
            } else {
                await followUser(requestedTargetId);
                trackEvent(ANALYTICS_EVENTS.USER_FOLLOWED);
            }
            if (targetUserIdRef.current !== requestedTargetId) return;
            if (userMe?.id) {
                dispatch(setUserInfo(userMe.id));
                dispatch(setUserInfoFollowing(userMe.id));
            }
        } catch (err) {
            console.error("Failed to toggle follow:", err);
            if (targetUserIdRef.current !== requestedTargetId) return;
            toast.error(t("followers.couldNotUpdate"));
            setIsFollowing(wasFollowing);
        } finally {
            if (targetUserIdRef.current === requestedTargetId) setIsLoadingFollow(false);
        }
    };

    return { isFollowing, toggleFollow, isMyUser, isLoadingFollow };
};