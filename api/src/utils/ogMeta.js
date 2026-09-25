import { optimizedCloudinaryUrl } from './cloudinaryUrl.js';
import { countryFlag } from './countryCodes.js';

const DESCRIPTION_MAX_LENGTH = 160;
const OG_IMAGE_WIDTH = 1200;
const OG_MAX_PASSPORT_FLAGS = 10;

const defaultImageUrl = (appUrl) => `${appUrl}/images/hero.jpg`;

// For content that can't be shown (private or deleted): a preview of the app.
export const buildDefaultOgMeta = (appUrl) => ({
    title: 'ToBeATraveller',
    description: 'Plan your van trips, log the road and collect a stamp for every country you visit.',
    imageUrl: defaultImageUrl(appUrl),
});

export const buildItineraryOgMeta = (itinerary, appUrl) => {
    const title = itinerary.title || 'Trip on ToBeATraveller';
    const description = itinerary.description
        ? itinerary.description.slice(0, DESCRIPTION_MAX_LENGTH)
        : `A ${itinerary.tripTotalDays}-day trip to ${itinerary.location?.name || 'an amazing destination'}`;
    const imageUrl = optimizedCloudinaryUrl(itinerary.photoUrl, { width: OG_IMAGE_WIDTH }) || defaultImageUrl(appUrl);

    return { title, description, imageUrl };
};

export const buildUserOgMeta = (user, appUrl) => {
    const title = `@${user.username}`;
    const description = user.bio || user.about || `${user.username}'s travel itineraries on ToBeATraveller`;
    const imageUrl = optimizedCloudinaryUrl(user.avatarUrl, { width: OG_IMAGE_WIDTH }) || defaultImageUrl(appUrl);

    return { title, description, imageUrl };
};

// Built from the public passport only (what any visitor sees). English, like
// the other previews: link-preview bots don't say which language they want.
export const buildPassportOgMeta = (passport, appUrl) => {
    const { owner, countries } = passport;
    const countryCount = countries.length;
    const title = countryCount > 0
        ? `@${owner.username}'s travel passport: ${countryCount} ${countryCount === 1 ? 'country' : 'countries'}`
        : `@${owner.username}'s travel passport`;

    const flags = countries.slice(0, OG_MAX_PASSPORT_FLAGS).map(country => countryFlag(country.code)).join(' ');
    const hiddenCount = countryCount - OG_MAX_PASSPORT_FLAGS;
    const flagLine = hiddenCount > 0 ? `${flags} +${hiddenCount}` : flags;
    const pitch = 'Collect a stamp for every country you visit on ToBeATraveller.';
    const description = (flagLine ? `${flagLine} ${pitch}` : pitch).slice(0, DESCRIPTION_MAX_LENGTH);

    return { title, description, imageUrl: defaultImageUrl(appUrl) };
};
