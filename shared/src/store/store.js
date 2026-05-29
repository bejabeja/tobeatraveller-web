import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './auth/authReducer.js';
import { filterReducer } from './filters/filterReducer.js';
import { itinerariesReducer } from './itineraries/itinerariesReducer.js';
import { notificationsReducer } from './notifications/notificationsReducer.js';
import { userInfoReducer } from './user/userInfoReducer.js';
import { usersReducer } from './users/usersReducer.js';

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
