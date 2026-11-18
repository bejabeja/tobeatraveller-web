import { clearAllItineraryDrafts } from '../utils/itineraryDraftStorage';
import { getApiUrl } from "@tobeatraveller/shared";
import { parseError } from "../utils/parseError";

// Where the session was kept before it moved to cookies no script can read. Whoever had one
// there signs in again once; a copy left behind would be just what a script could take.
const LEGACY_TOKEN_KEYS = ['access_token', 'refresh_token'];

export const forgetStoredTokens = () => {
    try {
        LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
        // Storage the browser does not let the page use holds nothing to forget.
    }
};


export const createNewUser = async (user) => {
    const response = await fetch(`${getApiUrl()}/auth/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
    }
    );
    if (!response.ok) {
        await parseError(response, 'Create user failed');
    }
    return response.json();
}

export const login = async (user) => {
    const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
        credentials: 'include',
    });
    if (!response.ok) await parseError(response, 'Login failed');

    // The session comes back in cookies the page cannot read; the tokens also in the
    // answer are for the app, and are not kept here.
    const data = await response.json();
    return data.user;
};

export const logout = async () => {
    const response = await fetch(`${getApiUrl()}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        await parseError(response, 'Logout failed');
    }

    clearAllItineraryDrafts();

    return response.json();
}
