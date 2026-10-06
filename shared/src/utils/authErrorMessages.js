const AUTH_ERROR_TRANSLATION_KEYS = {
    "Invalid credentials": "auth.invalidCredentials",
    "Email already in use": "auth.emailInUse",
    "Username is not available. Please choose another one.": "auth.usernameNotAvailable",
    "Invalid or expired token": "errors.invalidLink",
    "Email already confirmed": "emailVerification.alreadyConfirmed",
    "Too many attempts, please try again later.": "auth.tooManyAttempts",
};

export const translateAuthError = (t, message) => {
    const key = AUTH_ERROR_TRANSLATION_KEYS[message];
    return key ? t(key) : message;
};
