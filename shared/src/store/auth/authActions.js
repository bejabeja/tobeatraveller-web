import { createNewUser, login, logout } from "../../services/auth";
import { getUserForAuth } from "../../services/users";
import { resetUserInfo } from "../user/userInfoActions";
import { getCachedAuthUser, setCachedAuthUser } from "../../utils/cachedAuthUser";
import { isNetworkError } from "../../utils/parseError";

export const registerUser = (user, onSuccess) => {
    return async (dispatch) => {
        try {
            await createNewUser(user);
            const newUser = await login(user);
            await setCachedAuthUser(newUser);
            dispatch({ type: "@auth/login", payload: newUser });
            if (onSuccess) onSuccess();
        } catch (error) {
            dispatch({ type: "@auth/create-user", error: error.message });
            throw error;
        }
    };
};

export const loginUser = (user, onSuccess) => {
    return async (dispatch) => {
        try {
            const newUser = await login(user);
            await setCachedAuthUser(newUser);
            dispatch({ type: "@auth/login", payload: newUser });
            if (onSuccess) onSuccess();
        } catch (error) {
            dispatch({ type: "@auth/login", payload: null, error: error.message });
            throw error;
        }
    };
};

export const logoutUser = () => {
    return async (dispatch) => {
        try {
            await logout();
            dispatch({ type: "@auth/logout" });
            dispatch(resetUserInfo());
        } catch {
            // best-effort: nothing else to do if the server-side logout call fails.
        }
    };
};

export const initAuthUser = () => {
    return async (dispatch) => {
        try {
            const user = await getUserForAuth();
            await setCachedAuthUser(user);
            dispatch({ type: "@auth/init", payload: user });
        } catch (error) {
            // No connection doesn't mean no session: opening the app offline
            // keeps the last known user, so the offline screens still work.
            const cachedUser = isNetworkError(error) ? await getCachedAuthUser() : null;
            dispatch({ type: "@auth/init", payload: cachedUser });
            if (!cachedUser) dispatch(resetUserInfo());
        }
    };
};

export const clearError = () => {
    return { type: "@auth/clearError" };
};

export const setImageHeroLoaded = () => {
    return { type: "@auth/setImageHeroLoaded" };
};

export const setImageAuthLoaded = () => {
    return { type: "@auth/setImageAuthLoaded" };
};
