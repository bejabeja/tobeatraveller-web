import { isNetworkError } from './parseError.js';
import { VALIDATION_MESSAGE_PREFIX } from './validationMessages.js';

// What the API says in English that a person can run into, by the key it is shown with in each
// language. The API keeps sending the English: the versions of the apps already published show
// the text as it comes, and would show a key instead.
const API_ERROR_TRANSLATION_KEYS = {
    "Invalid credentials": "auth.invalidCredentials",
    "Email already in use": "auth.emailInUse",
    "Username is not available. Please choose another one.": "auth.usernameNotAvailable",
    "Invalid or expired token": "errors.invalidLink",
    "Invalid token": "errors.invalidLink",
    "Email already confirmed": "emailVerification.alreadyConfirmed",
    "Too many attempts, please try again later.": "auth.tooManyAttempts",
    "Current password is incorrect": "auth.wrongCurrentPassword",
    "Only image files are allowed": "apiErrors.imagesOnly",
    "A receipt photo file is required": "apiErrors.receiptPhotoRequired",
    "Itinerary not found": "errors.itineraryNotFoundOrPrivate",
    "User not found": "errors.profileNotFound",
    "Comment not found": "apiErrors.commentNotFound",
    "Report target not found": "apiErrors.reportTargetGone",
    "Already following this user": "apiErrors.alreadyFollowing",
    "You cannot follow yourself": "apiErrors.cannotFollowYourself",
    "You already have an active subscription": "apiErrors.subscriptionAlreadyActive",
    "No pending cancellation to resume": "apiErrors.noCancellationToResume",
    "No subscription found for this user": "apiErrors.noSubscription",
    "This feature requires a premium subscription": "apiErrors.premiumRequired",
    "Too many confirmation emails, please try again later.": "apiErrors.tooManyConfirmationEmails",
    "Too many contact messages, please try again later.": "apiErrors.tooManyContactMessages",
    "Too many reports, please try again later.": "apiErrors.tooManyReports",
    "Too many itinerary generations, please slow down and try again in a minute.": "apiErrors.tooManyGenerations",
    "The AI itinerary generator is busy right now, please try again in a minute.": "apiErrors.generatorBusy",
    "Forbidden: insufficient permissions": "apiErrors.insufficientPermissions",
    "Only a superadmin can change or delete a staff account": "apiErrors.onlySuperadminActsOnStaff",
    "Only a superadmin can grant the superadmin role": "apiErrors.onlySuperadminGrantsSuperadmin",
    "You cannot change your own role": "apiErrors.cannotChangeOwnRole",
    "You cannot send yourself a notice": "apiErrors.cannotNoticeYourself",
};

// For a message that is the API's own text: its translation when there is one (a validation
// key, or a message in the table), and otherwise the fallback, which is the text itself unless
// a screen gives its own.
export const translateApiError = (t, message, fallback = message) => {
    if (typeof message === 'string' && message.startsWith(VALIDATION_MESSAGE_PREFIX)) return t(message);
    const key = API_ERROR_TRANSLATION_KEYS[message];
    return key ? t(key) : fallback;
};

// What to tell the person when a request failed: what the API said, in their language, when it
// said something they can act on; that there is no connection; or else the screen's own message.
// Never the English a request falls back to when the API said nothing (a failure on its side).
export const userFacingError = (t, error, fallback) => {
    if (isNetworkError(error)) return t('errors.networkError');
    return translateApiError(t, error?.apiMessage, fallback);
};
