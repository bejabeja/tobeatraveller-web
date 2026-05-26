import { getAllFollowers, getAllFollowing } from "../../services/followers";
import { getItinerariesByUserId } from "../../services/itineraries";
import { getUserById } from "../../services/users";

export const START_LOADING_MY_INFO_ME = "@myInfo/me/loading";
export const SET_MY_INFO_ME = "@myInfo/me/init";
export const SET_ERROR_MY_INFO_ME = "@myInfo/me/error";
export const RESET_MY_INFO_ME = "@myInfo/me/reset";

export const START_LOADING_MY_INFO_ITINERARIES = "@myInfo/itineraries/loading";
export const SET_MY_INFO_ITINERARIES = "@myInfo/itineraries/init";
export const SET_ERROR_MY_INFO_ITINERARIES = "@myInfo/itineraries/error";
export const RESET_MY_INFO_ITINERARIES = "@myInfo/itineraries/reset";

export const START_LOADING_MY_INFO_FOLLOWING = "@myInfo/following/loading";
export const SET_MY_INFO_FOLLOWING = "@myInfo/following/init";
export const SET_ERROR_MY_INFO_FOLLOWING = "@myInfo/following/error";
export const RESET_MY_INFO_FOLLOWING = "@myInfo/following/reset";

export const START_LOADING_MY_INFO_FOLLOWERS = "@myInfo/followers/loading";
export const SET_MY_INFO_FOLLOWERS = "@myInfo/followers/init";
export const SET_ERROR_MY_INFO_FOLLOWERS = "@myInfo/followers/error";
export const RESET_MY_INFO_FOLLOWERS = "@myInfo/followers/reset";

export const setUserInfo = (userId) => {
    return async (dispatch) => {
        dispatch({ type: START_LOADING_MY_INFO_ME });

        try {
            const userInfo = await getUserById(userId);
            dispatch({ type: SET_MY_INFO_ME, payload: userInfo });
        } catch (error) {
            dispatch({
                type: SET_ERROR_MY_INFO_ME,
                payload: error.message || "Failed to load user data",
            });
        }
    };
};

export const setUserInfoItineraries = (userId) => {
    return async (dispatch) => {
        dispatch({ type: START_LOADING_MY_INFO_ITINERARIES });

        try {
            const myItineraries = await getItinerariesByUserId(userId);
            dispatch({ type: SET_MY_INFO_ITINERARIES, payload: myItineraries });
        } catch (error) {
            dispatch({
                type: SET_ERROR_MY_INFO_ITINERARIES,
                payload: error.message || "Failed to load user data",
            });
        }
    };
};

export const setUserInfoFollowing = (userId) => {
    return async (dispatch) => {
        dispatch({ type: START_LOADING_MY_INFO_FOLLOWING });

        try {
            const myFollowings = await getAllFollowing(userId);

            dispatch({ type: SET_MY_INFO_FOLLOWING, payload: myFollowings });
        } catch (error) {
            dispatch({
                type: SET_ERROR_MY_INFO_FOLLOWING,
                payload: error.message || "Failed to load user data",
            });
        }
    };
}

export const setUserInfoFollowers = (userId) => {
    return async (dispatch) => {
        dispatch({ type: START_LOADING_MY_INFO_FOLLOWERS });

        try {
            const myFollowers = await getAllFollowers(userId);
            dispatch({ type: SET_MY_INFO_FOLLOWERS, payload: myFollowers });
        } catch (error) {
            dispatch({
                type: SET_ERROR_MY_INFO_FOLLOWERS,
                payload: error.message || "Failed to load user data",
            });
        }
    };
}


export const loadMyUserInfo = (userId) => {
    return (dispatch) => {
        dispatch(resetUserInfo());

        dispatch(setUserInfo(userId));
        dispatch(setUserInfoItineraries(userId));
        dispatch(setUserInfoFollowing(userId));
        dispatch(setUserInfoFollowers(userId));
    };
};

export const resetUserInfo = () => {
    return (dispatch) => {
        dispatch({ type: RESET_MY_INFO_ME });
        dispatch({ type: RESET_MY_INFO_ITINERARIES });
        dispatch({ type: RESET_MY_INFO_FOLLOWING });
        dispatch({ type: RESET_MY_INFO_FOLLOWERS });
    };
};

