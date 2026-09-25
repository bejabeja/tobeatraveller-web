export {
    selectAuth,
    selectIsAuthenticated,
    selectAuthError,
    selectAuthUser,
    selectimageHeroLoaded,
    selectimageAuthLoaded,
} from '@tobeatraveller/shared';

// Web only: the web keeps its own auth state (see store/auth/authReducer.js).
export const selectIsAuthChecked = (state) => state.auth.isAuthChecked;
