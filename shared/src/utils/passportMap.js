import { WORLD_MAP } from './constants/worldMap.js';

export const MAP_COUNTRY_STATES = Object.freeze({
    VISITED: 'visited',
    // Visited, but only the owner sees it (from van log, diary or a private trip).
    PRIVATE: 'private',
    // Marked by the user: shown, though no trip backs it.
    DECLARED: 'declared',
});

// The world map of a passport, the same on web and mobile: each country's
// outline with how it's painted, the painted ones last so their borders
// show, and a dot on the painted ones too small to see.
export const passportMap = (passport) => {
    const visited = new Map(passport.countries.map(country => [country.code, country]));
    const declared = new Set((passport.declaredCountries ?? []).map(country => country.code));
    const stateOf = (code) => {
        if (visited.has(code)) return visited.get(code).isPrivate ? MAP_COUNTRY_STATES.PRIVATE : MAP_COUNTRY_STATES.VISITED;
        return declared.has(code) ? MAP_COUNTRY_STATES.DECLARED : null;
    };

    const countries = Object.entries(WORLD_MAP.countries)
        .map(([code, { d, dot }]) => {
            const state = stateOf(code);
            return { code, d: d ?? null, dot: state && dot ? dot : null, state };
        })
        .sort((first, second) => Number(Boolean(first.state)) - Number(Boolean(second.state)));

    return { width: WORLD_MAP.width, height: WORLD_MAP.height, countries };
};

// The world map on the shareable image: the countries it shares all painted
// alike. Whether a private one goes out at all was the owner's choice.
export const passportShareMap = (countryCodes) => passportMap({ countries: countryCodes.map(code => ({ code })) });
