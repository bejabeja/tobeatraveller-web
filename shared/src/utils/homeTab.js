export const HOME_TABS = Object.freeze({ DISCOVER: 'discover', FOLLOWING: 'following' });

// How long the Home waits to know what to open on before showing something.
export const HOME_TAB_PATIENCE_MS = 3000;

// Which tab the Home of someone signed in opens on, and whether that is known
// yet. Until they choose, the feed of the people they follow opens if it has
// anything new; otherwise discovering. It is not decided until the profile
// (who they follow) and the feed are known, so the Home does not open one tab
// and swap it a moment later. A profile that failed to load, or a request that
// takes too long, must not leave it waiting for good.
export const chooseHomeTab = ({
    isAuthenticated,
    chosenTab = null,
    hasProfile = false,
    profileFailed = false,
    feedChecked = false,
    followsAnyone = false,
    feedHasTrips = false,
    patienceElapsed = false,
}) => {
    if (!isAuthenticated) return { tab: HOME_TABS.DISCOVER, isDecided: true };
    if (chosenTab) return { tab: chosenTab, isDecided: true };

    return {
        tab: followsAnyone && feedHasTrips ? HOME_TABS.FOLLOWING : HOME_TABS.DISCOVER,
        isDecided: patienceElapsed || (feedChecked && (hasProfile || profileFailed)),
    };
};
