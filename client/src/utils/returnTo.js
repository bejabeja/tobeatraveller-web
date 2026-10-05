// What the login and sign-up pages take in `state` to bring someone back to
// the page they were on once they have an account.
export const returnToState = ({ pathname, search = "" }) => ({ redirectTo: `${pathname}${search}` });
