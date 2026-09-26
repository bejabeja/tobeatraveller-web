import { countryFlag } from './countryCodes.js';
import { DEFAULT_LANGUAGE } from './languages.js';

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
        recap_ready: () => ({
            title: 'Your year on the road is ready',
            body: 'Countries, nights in the van, stamps... See your year and share it.',
        }),
        country_stamp: ({ countryCode }) => ({
            title: 'New country in your passport',
            body: `${countryFlag(countryCode)} ${countryNameIn('en', countryCode)} is in your passport now. Tap to share it.`,
        }),
        // Badge names only exist in the apps' translations, so a badge isn't named.
        friend_stamp: ({ actorUsername, countryCode }) => (countryCode
            ? { title: 'New country', body: `${actorUsername} added ${countryFlag(countryCode)} ${countryNameIn('en', countryCode)} to their passport` }
            : { title: 'New stamp', body: `${actorUsername} earned a new stamp in their passport` }),
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
        recap_ready: () => ({
            title: 'Tu año en ruta ya está listo',
            body: 'Países, noches en la furgo, sellos... Descubre tu año y compártelo.',
        }),
        country_stamp: ({ countryCode }) => ({
            title: 'Nuevo país en tu pasaporte',
            body: `${countryFlag(countryCode)} ${countryNameIn('es', countryCode)} ya está en tu pasaporte. Tócalo para compartirlo.`,
        }),
        friend_stamp: ({ actorUsername, countryCode }) => (countryCode
            ? { title: 'Nuevo país', body: `${actorUsername} ha añadido ${countryFlag(countryCode)} ${countryNameIn('es', countryCode)} a su pasaporte` }
            : { title: 'Nuevo sello', body: `${actorUsername} ha conseguido un sello nuevo en su pasaporte` }),
    },
    fr: {
        comment: ({ actorUsername, itineraryTitle }) => ({
            title: 'Nouveau commentaire',
            body: `${actorUsername} a commenté « ${itineraryTitle} »`,
        }),
        like: ({ actorUsername, itineraryTitle }) => ({
            title: "Nouveau j'aime",
            body: `${actorUsername} a aimé « ${itineraryTitle} »`,
        }),
        follow: ({ actorUsername }) => ({
            title: 'Nouvel abonné',
            body: `${actorUsername} a commencé à te suivre`,
        }),
        referral_reward: ({ actorUsername }) => ({
            title: 'Récompense de parrainage',
            body: `${actorUsername} et toi avez gagné 1 mois de Premium`,
        }),
        badge_earned: () => ({
            title: 'Nouveau badge',
            body: 'Tu as obtenu un nouveau badge. Touche pour le voir et le partager.',
        }),
        recap_ready: () => ({
            title: 'Ton année sur la route est prête',
            body: 'Pays, nuits en van, tampons... Découvre ton année et partage-la.',
        }),
        country_stamp: ({ countryCode }) => ({
            title: 'Nouveau pays dans ton passeport',
            body: `${countryFlag(countryCode)} ${countryNameIn('fr', countryCode)} est maintenant dans ton passeport. Touche pour le partager.`,
        }),
        friend_stamp: ({ actorUsername, countryCode }) => (countryCode
            ? { title: 'Nouveau pays', body: `${actorUsername} a ajouté ${countryFlag(countryCode)} ${countryNameIn('fr', countryCode)} à son passeport` }
            : { title: 'Nouveau tampon', body: `${actorUsername} a obtenu un nouveau tampon dans son passeport` }),
    },
    it: {
        comment: ({ actorUsername, itineraryTitle }) => ({
            title: 'Nuovo commento',
            body: `${actorUsername} ha commentato "${itineraryTitle}"`,
        }),
        like: ({ actorUsername, itineraryTitle }) => ({
            title: 'Nuovo mi piace',
            body: `A ${actorUsername} piace "${itineraryTitle}"`,
        }),
        follow: ({ actorUsername }) => ({
            title: 'Nuovo follower',
            body: `${actorUsername} ha iniziato a seguirti`,
        }),
        referral_reward: ({ actorUsername }) => ({
            title: 'Premio per invito',
            body: `Tu e ${actorUsername} avete ottenuto 1 mese di Premium`,
        }),
        badge_earned: () => ({
            title: 'Nuovo badge',
            body: 'Hai ottenuto un nuovo badge. Tocca per vederlo e condividerlo.',
        }),
        recap_ready: () => ({
            title: 'Il tuo anno in viaggio è pronto',
            body: 'Paesi, notti in van, timbri... Scopri il tuo anno e condividilo.',
        }),
        country_stamp: ({ countryCode }) => ({
            title: 'Nuovo paese nel tuo passaporto',
            body: `${countryFlag(countryCode)} ${countryNameIn('it', countryCode)} è ora nel tuo passaporto. Tocca per condividerlo.`,
        }),
        friend_stamp: ({ actorUsername, countryCode }) => (countryCode
            ? { title: 'Nuovo paese', body: `${actorUsername} ha aggiunto ${countryFlag(countryCode)} ${countryNameIn('it', countryCode)} al suo passaporto` }
            : { title: 'Nuovo timbro', body: `${actorUsername} ha ottenuto un nuovo timbro nel suo passaporto` }),
    },
    de: {
        comment: ({ actorUsername, itineraryTitle }) => ({
            title: 'Neuer Kommentar',
            body: `${actorUsername} hat „${itineraryTitle}“ kommentiert`,
        }),
        like: ({ actorUsername, itineraryTitle }) => ({
            title: 'Neues Like',
            body: `${actorUsername} gefällt „${itineraryTitle}“`,
        }),
        follow: ({ actorUsername }) => ({
            title: 'Neuer Follower',
            body: `${actorUsername} folgt dir jetzt`,
        }),
        referral_reward: ({ actorUsername }) => ({
            title: 'Einladungsprämie',
            body: `Du und ${actorUsername} habt 1 Monat Premium bekommen`,
        }),
        badge_earned: () => ({
            title: 'Neues Abzeichen',
            body: 'Du hast ein neues Abzeichen bekommen. Tippe, um es anzusehen und zu teilen.',
        }),
        recap_ready: () => ({
            title: 'Dein Jahr unterwegs ist fertig',
            body: 'Länder, Nächte im Van, Stempel... Sieh dir dein Jahr an und teile es.',
        }),
        country_stamp: ({ countryCode }) => ({
            title: 'Neues Land in deinem Pass',
            body: `${countryFlag(countryCode)} ${countryNameIn('de', countryCode)} ist jetzt in deinem Pass. Tippe, um es zu teilen.`,
        }),
        friend_stamp: ({ actorUsername, countryCode }) => (countryCode
            ? { title: 'Neues Land', body: `${actorUsername} hat jetzt ${countryFlag(countryCode)} ${countryNameIn('de', countryCode)} im Pass` }
            : { title: 'Neuer Stempel', body: `${actorUsername} hat einen neuen Stempel im Pass bekommen` }),
    },
};

export const buildPushMessage = (type, locale, context) => {
    const messages = PUSH_MESSAGES[locale] ?? PUSH_MESSAGES[DEFAULT_LANGUAGE];
    return messages[type]?.(context) ?? null;
};
