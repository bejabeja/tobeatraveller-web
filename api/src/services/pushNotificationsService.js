import config from '../config/config.js';
import { buildPushMessage } from '../utils/pushMessages.js';
import { logger } from '../utils/logger.js';

const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
// Expo rejects requests with more than 100 messages.
const EXPO_PUSH_BATCH_SIZE = 100;
// Must match the channel id the mobile app creates on Android.
export const ANDROID_NOTIFICATION_CHANNEL_ID = 'default';
// The app refreshes its token on every launch, so a token not seen for this
// long belongs to an uninstalled app or an abandoned device.
export const STALE_PUSH_TOKEN_DAYS = 90;
const DEVICE_NOT_REGISTERED = 'DeviceNotRegistered';

const chunk = (items, size) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
    return chunks;
};

export class PushNotificationsService {
    constructor(pushTokensRepository, userRepository, itineraryRepository) {
        this.pushTokensRepository = pushTokensRepository;
        this.userRepository = userRepository;
        this.itineraryRepository = itineraryRepository;
        this.accessToken = config.expoAccessToken;
    }

    async registerToken(userId, { token, platform, locale }) {
        await this.pushTokensRepository.upsert({ userId, token, platform, locale });
    }

    async unregisterToken(userId, token) {
        await this.pushTokensRepository.deleteForUser(userId, token);
    }

    async purgeStaleTokens() {
        const deletedCount = await this.pushTokensRepository.deleteNotSeenSince(STALE_PUSH_TOKEN_DAYS);
        logger.info(`[push] purged ${deletedCount} stale push tokens`);
        return deletedCount;
    }

    async sendNotificationPush({ userId, actorId, type, itineraryId, commentId, badgeId, countryCode }) {
        const devices = await this.pushTokensRepository.findByUserId(userId);
        if (devices.length === 0) return;

        const [actor, itinerary] = await Promise.all([
            this.userRepository.getUserById(actorId),
            itineraryId ? this.itineraryRepository.findById(itineraryId) : null,
        ]);
        if (!actor || (itineraryId && !itinerary)) return;

        const context = { actorUsername: actor.username, itineraryTitle: itinerary?.title, countryCode };
        // badgeId / countryCode let a tap open that very badge or country, ready to share.
        const data = {
            type, actorId,
            itineraryId: itineraryId ?? null,
            commentId: commentId ?? null,
            badgeId: badgeId ?? null,
            countryCode: countryCode ?? null,
        };
        const messages = devices
            .map(device => ({ device, message: buildPushMessage(type, device.locale, context) }))
            .filter(({ message }) => message)
            .map(({ device, message }) => ({
                to: device.token,
                ...message,
                data,
                sound: 'default',
                channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
            }));

        for (const batch of chunk(messages, EXPO_PUSH_BATCH_SIZE)) {
            await this._sendBatch(batch);
        }
    }

    async _sendBatch(messages) {
        const response = await fetch(EXPO_PUSH_SEND_URL, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                ...(this.accessToken ? { 'authorization': `Bearer ${this.accessToken}` } : {}),
            },
            body: JSON.stringify(messages),
        });

        if (!response.ok) {
            logger.error(`[push] Expo push request failed with status ${response.status}`);
            return;
        }

        // Tickets come back in the same order as the messages sent.
        const { data: tickets = [] } = await response.json();
        const unregisteredTokens = tickets
            .map((ticket, index) => ticket.details?.error === DEVICE_NOT_REGISTERED ? messages[index].to : null)
            .filter(Boolean);

        tickets
            .filter(ticket => ticket.status === 'error' && ticket.details?.error !== DEVICE_NOT_REGISTERED)
            .forEach(ticket => logger.warn(`[push] Expo rejected a push: ${ticket.message}`));

        await this.pushTokensRepository.deleteTokens(unregisteredTokens);
    }
}
