export const SUPPORTED_PUSH_LOCALES = ['en', 'es'];
export const DEFAULT_PUSH_LOCALE = 'en';

const REGIONAL_INDICATOR_OFFSET = 0x1F1E6 - 'A'.charCodeAt(0);
const countryFlag = (code) => String.fromCodePoint(...[...code].map(letter => letter.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET));
const countryNameIn = (locale, code) => new Intl.DisplayNames([locale], { type: 'region', fallback: 'code' }).of(code);

// Only the actor and the itinerary title go into the message, never the
// comment text: pushes show up on the lock screen, where anyone holding the
// phone can read them.
const PUSH_MESSAGES = {
    en: {
        comment: ({ actorUsername, itineraryTitle }) => ({
            title: 'New comment',
            body: `${actorUsername} commented on "${itineraryTitle}"`,
        }),
        like: ({ actorUsername, itineraryTitle }) => ({
            title: 'New like',
            body: `${actorUsername} liked "${itineraryTitle}"`,
        }),
        follow: ({ actorUsername }) => ({
            title: 'New follower',
            body: `${actorUsername} started following you`,
        }),
        referral_reward: ({ actorUsername }) => ({
            title: 'Referral reward',
            body: `You and ${actorUsername} earned 1 month of Premium`,
        }),
        badge_earned: () => ({
            title: 'New badge',
            body: 'You earned a new badge. Tap to see it and share it.',
        }),
        country_stamp: ({ countryCode }) => ({
            title: 'New country in your passport',
            body: `${countryFlag(countryCode)} ${countryNameIn('en', countryCode)} is in your passport now. Tap to share it.`,
        }),
    },
    es: {
        comment: ({ actorUsername, itineraryTitle }) => ({
            title: 'Nuevo comentario',
            body: `${actorUsername} comentó en "${itineraryTitle}"`,
        }),
        like: ({ actorUsername, itineraryTitle }) => ({
            title: 'Nuevo me gusta',
            body: `A ${actorUsername} le gustó "${itineraryTitle}"`,
        }),
        follow: ({ actorUsername }) => ({
            title: 'Nuevo seguidor',
            body: `${actorUsername} empezó a seguirte`,
        }),
        referral_reward: ({ actorUsername }) => ({
            title: 'Recompensa por invitación',
            body: `${actorUsername} y tú habéis ganado 1 mes de Premium`,
        }),
        badge_earned: () => ({
            title: 'Nuevo badge',
            body: 'Has conseguido un badge nuevo. Tócalo para verlo y compartirlo.',
        }),
        country_stamp: ({ countryCode }) => ({
            title: 'Nuevo país en tu pasaporte',
            body: `${countryFlag(countryCode)} ${countryNameIn('es', countryCode)} ya está en tu pasaporte. Tócalo para compartirlo.`,
        }),
    },
};

export const buildPushMessage = (type, locale, context) => {
    const messages = PUSH_MESSAGES[locale] ?? PUSH_MESSAGES[DEFAULT_PUSH_LOCALE];
    return messages[type]?.(context) ?? null;
};
