// Validation messages are translation keys ("validation.emailInvalid"),
// turned into text where they're shown, in the viewer's language. Anything
// else (a message from the API) is shown as it came.
export const VALIDATION_MESSAGE_PREFIX = 'validation.';

export const translateValidationMessage = (t, message) =>
    typeof message === 'string' && message.startsWith(VALIDATION_MESSAGE_PREFIX) ? t(message) : message;
