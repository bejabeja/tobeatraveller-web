import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { checkIsLiked, toggleLike } from "../services/likes";
import { selectIsAuthenticated } from "../store/auth/authSelectors";
import { returnToState } from "../utils/returnTo";
import { trackEvent } from "../utils/analytics";
import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";

export const useLike = (itineraryId, initialLikesCount = 0) => {
    const { t } = useTranslation();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const navigate = useNavigate();
    const location = useLocation();
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(initialLikesCount);
    const [isToggling, setIsToggling] = useState(false);

    // Tracks the itinerary currently on screen, so a toggleLike request that resolves
    // after navigating to a different itinerary (the hook instance can be reused across
    // an in-page param-only navigation) doesn't write its result into the wrong itinerary's state.
    const itineraryIdRef = useRef(itineraryId);
    useEffect(() => {
        itineraryIdRef.current = itineraryId;
        setIsToggling(false);
    }, [itineraryId]);

    useEffect(() => {
        if (!isAuthenticated || !itineraryId) return;
        checkIsLiked(itineraryId)
            .then(({ isLiked, likesCount }) => {
                setIsLiked(isLiked);
                setLikesCount(likesCount);
            })
            .catch(() => {});
    }, [itineraryId, isAuthenticated]);

    const handleToggleLike = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            navigate("/login", { state: returnToState(location) });
            return;
        }
        if (isToggling) return;

        const requestedItineraryId = itineraryId;
        const wasLiked = isLiked;
        setIsLiked(!wasLiked);
        setLikesCount((prev) => (wasLiked ? prev - 1 : prev + 1));
        setIsToggling(true);

        try {
            const data = await toggleLike(itineraryId);
            if (data.isLiked) trackEvent(ANALYTICS_EVENTS.TRIP_LIKED);
            if (itineraryIdRef.current !== requestedItineraryId) return;
            setIsLiked(data.isLiked);
            setLikesCount(data.likesCount);
        } catch (err) {
            console.error("[useLike] toggleLike failed:", err);
            if (itineraryIdRef.current !== requestedItineraryId) return;
            toast.error(t("itinerary.errorLike"));
            setIsLiked(wasLiked);
            setLikesCount((prev) => (wasLiked ? prev + 1 : prev - 1));
        } finally {
            if (itineraryIdRef.current === requestedItineraryId) setIsToggling(false);
        }
    };

    return { isLiked, likesCount, handleToggleLike, isToggling };
};
