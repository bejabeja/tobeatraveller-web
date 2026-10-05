import { describe, expect, it } from 'vitest';
import { chooseHomeTab, HOME_TABS } from '../../utils/homeTab.js';

const known = { isAuthenticated: true, hasProfile: true, feedChecked: true, followsAnyone: false, feedHasTrips: false };

describe('chooseHomeTab', () => {
    it('is always discovering for a visitor, and decided at once', () => {
        expect(chooseHomeTab({ isAuthenticated: false })).toEqual({ tab: HOME_TABS.DISCOVER, isDecided: true });
    });

    it('opens on the people they follow when they follow someone and there is something new', () => {
        expect(chooseHomeTab({ ...known, followsAnyone: true, feedHasTrips: true })).toEqual({ tab: HOME_TABS.FOLLOWING, isDecided: true });
    });

    it('opens on discovering when they follow nobody', () => {
        expect(chooseHomeTab({ ...known, feedHasTrips: true })).toEqual({ tab: HOME_TABS.DISCOVER, isDecided: true });
    });

    it('opens on discovering when the people they follow have shared nothing yet', () => {
        expect(chooseHomeTab({ ...known, followsAnyone: true, feedHasTrips: false })).toEqual({ tab: HOME_TABS.DISCOVER, isDecided: true });
    });

    it('waits for the feed and the profile before choosing, so it does not open one tab and swap it', () => {
        expect(chooseHomeTab({ ...known, feedChecked: false }).isDecided).toBe(false);
        expect(chooseHomeTab({ ...known, hasProfile: false }).isDecided).toBe(false);
    });

    // Regression-in-waiting: a profile that failed to load left the Home on its skeleton for good.
    it('does not wait for a profile that failed to load', () => {
        expect(chooseHomeTab({ ...known, hasProfile: false, profileFailed: true })).toEqual({ tab: HOME_TABS.DISCOVER, isDecided: true });
    });

    // Regression-in-waiting: a request that hangs must not leave them with nothing to see.
    it('stops waiting after a while, whatever is still missing', () => {
        expect(chooseHomeTab({ ...known, feedChecked: false, hasProfile: false, patienceElapsed: true }).isDecided).toBe(true);
    });

    it('goes where they choose, even before it is known what would have opened', () => {
        expect(chooseHomeTab({ isAuthenticated: true, chosenTab: HOME_TABS.FOLLOWING, feedChecked: false, hasProfile: false }))
            .toEqual({ tab: HOME_TABS.FOLLOWING, isDecided: true });
    });
});
