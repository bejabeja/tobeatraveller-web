import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { checkIsLiked, toggleLike } from "../services/likes";
import { selectIsAuthenticated } from "../store/auth/authSelectors";

export const useLike = (itineraryId, initialLikesCount = 0) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const navigate = useNavigate();
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(initialLikesCount);

    useEffect(() => {
        if (!isAuthenticated || !itineraryId) return;
        checkIsLiked(itineraryId)
            .then(({ isLiked }) => setIsLiked(isLiked))
            .catch(() => {});
    }, [itineraryId, isAuthenticated]);

    const handleToggleLike = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            navigate("/login");
            return;
        }

        const wasLiked = isLiked;
        setIsLiked(!wasLiked);
        setLikesCount((prev) => (wasLiked ? prev - 1 : prev + 1));

        try {
            const data = await toggleLike(itineraryId);
            setIsLiked(data.isLiked);
            setLikesCount(data.likesCount);
        } catch (err) {
            console.error("[useLike] toggleLike failed:", err);
            toast.error("Could not update like. Try again.");
            setIsLiked(wasLiked);
            setLikesCount((prev) => (wasLiked ? prev + 1 : prev - 1));
        }
    };

    return { isLiked, likesCount, handleToggleLike };
};
