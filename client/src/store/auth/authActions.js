import { toast } from "react-hot-toast";
import { translateAuthError } from "@tobeatraveller/shared";
import i18n from "../../i18n";
import { createNewUser, login, logout } from "../../services/auth";
import { getUserForAuth } from "../../services/users";
import { resetAnalytics } from "../../utils/analytics";
import { resetUserInfo } from "../user/userInfoActions";
import { getUserHint, saveUserHint } from "./userHint";

export const createUser = (user, onSuccess) => {
    return async (dispatch) => {
        try {
            await toast.promise(
                createNewUser(user),
                {
                    loading: i18n.t("auth.creatingAccount"),
                    success: i18n.t("auth.accountCreated"),
                    error: (err) => translateAuthError(i18n.t.bind(i18n), err.message) || i18n.t("auth.registrationFailed"),
                }
            );
            const newUser = await login(user);
            saveUserHint(newUser);
            dispatch({ type: "@auth/login", payload: newUser });
            if (onSuccess) onSuccess();
        } catch (error) {
            dispatch({ type: "@auth/create-user", error: error.message });
        }
    };
};

export const loginUser = (user, onSuccess) => {
    return async (dispatch) => {
        try {
            const newUser = await toast.promise(
                login(user),
                {
                    loading: i18n.t("auth.loggingIn"),
                    success: i18n.t("auth.welcomeBack"),
                    error: (err) => translateAuthError(i18n.t.bind(i18n), err.message) || i18n.t("auth.loginFailed"),
                }
            );
            saveUserHint(newUser);
            dispatch({ type: "@auth/login", payload: newUser });
            if (onSuccess) onSuccess();
        } catch (error) {
            dispatch({ type: "@auth/login", payload: null, error: error.message });
        }
    };
};

export const logoutUser = () => {
    return async (dispatch) => {
        try {
            await logout();
            saveUserHint(null);
            resetAnalytics();
            dispatch({ type: "@auth/logout" });
            dispatch(resetUserInfo());
            toast.success(i18n.t("auth.sessionClosed"));
        } catch {
            toast.error(i18n.t("auth.logoutFailed"));
        }
    };
};

export const initAuthUser = () => {
    return async (dispatch) => {
        try {
            const user = await getUserForAuth();
            saveUserHint(user);
            dispatch({ type: "@auth/init", payload: user });
        } catch {
            // The session couldn't be checked (no connection, the server
            // down), which doesn't mean it's over: whoever was signed in
            // stays signed in, as the hint of their last sign-in says.
            const lastUser = getUserHint();
            dispatch({ type: "@auth/init", payload: lastUser });
            if (!lastUser) dispatch(resetUserInfo());
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
