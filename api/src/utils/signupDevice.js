export const SIGNUP_DEVICES = {
    IOS_APP: 'ios_app',
    ANDROID_APP: 'android_app',
    MOBILE_WEB: 'mobile_web',
    DESKTOP_WEB: 'desktop_web',
    OTHER: 'other',
    UNKNOWN: 'unknown',
};

// The app does not present itself as a browser: on iPhone its requests carry the system's
// network library (CFNetwork/Darwin), and on Android the one React Native uses (okhttp).
const IOS_APP_PATTERN = /CFNetwork|Darwin/;
const ANDROID_APP_PATTERN = /okhttp/i;
const BROWSER_PATTERN = /^Mozilla\//;
const PHONE_OR_TABLET_PATTERN = /Mobile|Android|iPhone|iPad/;

export const signupDeviceFromUserAgent = (userAgent) => {
    if (!userAgent) return SIGNUP_DEVICES.UNKNOWN;
    if (BROWSER_PATTERN.test(userAgent)) {
        return PHONE_OR_TABLET_PATTERN.test(userAgent) ? SIGNUP_DEVICES.MOBILE_WEB : SIGNUP_DEVICES.DESKTOP_WEB;
    }
    if (IOS_APP_PATTERN.test(userAgent)) return SIGNUP_DEVICES.IOS_APP;
    if (ANDROID_APP_PATTERN.test(userAgent)) return SIGNUP_DEVICES.ANDROID_APP;
    return SIGNUP_DEVICES.OTHER;
};
