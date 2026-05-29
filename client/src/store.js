import { configureStore } from "@reduxjs/toolkit";
import {
    filterReducer,
    itinerariesReducer,
    notificationsReducer,
    userInfoReducer,
    usersReducer,
} from "@tobeatraveller/shared";

// authReducer stays local — web-specific initial state (localStorage hint)
// and image preloading flags (imageHeroLoaded, imageAuthLoaded)
import { authReducer } from "./store/auth/authReducer.js";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        myInfo: userInfoReducer,
        users: usersReducer,
        itineraries: itinerariesReducer,
        notifications: notificationsReducer,
        filters: filterReducer,
    },
});