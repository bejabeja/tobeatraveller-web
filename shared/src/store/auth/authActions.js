import { createNewUser, login, logout } from "../../services/auth";
import { getUserForAuth } from "../../services/users";
import { resetUserInfo } from "../user/userInfoActions";
import { getCachedAuthUser, setCachedAuthUser } from "../../utils/cachedAuthUser";

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
        } catch {
            // The session couldn't be checked (no connection, the server
            // down), which doesn't mean it's over: the last known user is
            // kept, so the app, and its offline screens, still work.
            const cachedUser = await getCachedAuthUser();
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
