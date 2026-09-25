import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { getItineraryById, createItinerary, deleteItinerary, updateItinerary } from '../../services/itinerary.js';
import { getFeedItineraries, getMyItineraries, generateSmartItinerary } from '../../services/itineraries.js';
import { getCommentsByItineraryId, addComment, deleteComment } from '../../services/comments.js';
import { addFavorite, removeFavorite, getUserFavorites, checkIsFavorite } from '../../services/favorites.js';
import { toggleLike, checkIsLiked } from '../../services/likes.js';
import { followUser, unfollowUser, getAllFollowers, getAllFollowing } from '../../services/followers.js';
import { fetchNotifications, fetchUnreadCount, markNotificationsRead } from '../../services/notifications.js';
import { registerPushToken, unregisterPushToken } from '../../services/pushTokens.js';
import { getUserPassport } from '../../services/passport.js';
import { getUserForAuth, getUserById, updateUser, deleteMyAccount, exportMyData, getSuggestedUsers } from '../../services/users.js';

const FAKE_TOKEN = 'test-access-token';

// Regression coverage for the bug that shipped getItineraryById/getCommentsByItineraryId
// with plain fetch: the backend applies the same visibility check it does for the
// itinerary/comments page, so a missing Authorization header silently turns "this is
// mine and private" into "not found" instead of throwing loudly.
const AUTHENTICATED_CALLS = [
    ['getItineraryById', () => getItineraryById('itinerary-1')],
    ['createItinerary', () => createItinerary(new FormData())],
    ['deleteItinerary', () => deleteItinerary('itinerary-1')],
    ['updateItinerary', () => updateItinerary('itinerary-1', new FormData())],
    ['getFeedItineraries', () => getFeedItineraries(1)],
    ['getMyItineraries', () => getMyItineraries()],
    ['generateSmartItinerary', () => generateSmartItinerary({ destination: 'Paris', days: 3 })],
    ['getCommentsByItineraryId', () => getCommentsByItineraryId('itinerary-1')],
    ['addComment', () => addComment('itinerary-1', 'hi')],
    ['deleteComment', () => deleteComment('comment-1')],
    ['addFavorite', () => addFavorite('itinerary-1')],
    ['removeFavorite', () => removeFavorite('itinerary-1')],
    ['getUserFavorites', () => getUserFavorites()],
    ['checkIsFavorite', () => checkIsFavorite('itinerary-1')],
    ['toggleLike', () => toggleLike('itinerary-1')],
    ['checkIsLiked', () => checkIsLiked('itinerary-1')],
    ['followUser', () => followUser('user-1')],
    ['unfollowUser', () => unfollowUser('user-1')],
    ['getAllFollowers', () => getAllFollowers('user-1')],
    ['getAllFollowing', () => getAllFollowing('user-1')],
    ['fetchNotifications', () => fetchNotifications()],
    ['fetchUnreadCount', () => fetchUnreadCount()],
    ['markNotificationsRead', () => markNotificationsRead()],
    ['getUserForAuth', () => getUserForAuth()],
    ['getUserById', () => getUserById('user-1')],
    ['updateUser', () => updateUser({ bio: 'hi' })],
    ['deleteMyAccount', () => deleteMyAccount()],
    ['exportMyData', () => exportMyData()],
    ['getSuggestedUsers', () => getSuggestedUsers()],
    ['registerPushToken', () => registerPushToken({ token: 'ExponentPushToken[a]', platform: 'android', locale: 'es' })],
    ['unregisterPushToken', () => unregisterPushToken('ExponentPushToken[a]')],
    ['getUserPassport', () => getUserPassport('user-1')],
];

describe('services gated by the logged-in user must send the access token', () => {
    beforeEach(() => {
        setApiUrl('http://api.test');
        setTokenStorage({
            getItem: async (key) => (key === 'access_token' ? FAKE_TOKEN : null),
            setItem: async () => {},
            removeItem: async () => {},
        });
        global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    });

    it.each(AUTHENTICATED_CALLS)('%s sends Authorization: Bearer <token>', async (_name, call) => {
        await call();

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const [, options] = global.fetch.mock.calls[0];
        expect(options.headers.Authorization).toBe(`Bearer ${FAKE_TOKEN}`);
    });
});
