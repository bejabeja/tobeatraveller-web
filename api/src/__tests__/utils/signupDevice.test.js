import { describe, expect, it } from 'vitest';
import { SIGNUP_DEVICES, signupDeviceFromUserAgent } from '../../utils/signupDevice.js';

describe('signupDeviceFromUserAgent', () => {
    it.each([
        ['the app on iPhone', 'ToBeATraveller/12 CFNetwork/3826.500.131 Darwin/24.5.0', SIGNUP_DEVICES.IOS_APP],
        ['the app on Android', 'okhttp/4.12.0', SIGNUP_DEVICES.ANDROID_APP],
        ['the web on a phone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1', SIGNUP_DEVICES.MOBILE_WEB],
        ['the web on an Android phone', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36', SIGNUP_DEVICES.MOBILE_WEB],
        ['the web on an iPad', 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/604.1', SIGNUP_DEVICES.MOBILE_WEB],
        ['the web on a computer', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', SIGNUP_DEVICES.DESKTOP_WEB],
        ['a script', 'curl/8.5.0', SIGNUP_DEVICES.OTHER],
        ['nothing', null, SIGNUP_DEVICES.UNKNOWN],
    ])('tells %s', (_case, userAgent, device) => {
        expect(signupDeviceFromUserAgent(userAgent)).toBe(device);
    });
});
