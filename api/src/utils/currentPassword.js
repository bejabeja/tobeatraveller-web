import bcrypt from "bcrypt";
import { ValidationError } from "../errors/ValidationError.js";

export const CURRENT_PASSWORD_FIELD = "currentPassword";

// A session someone else got hold of is not enough for the account's most serious
// changes (its password or email, deleting it, taking a copy of all it holds): it takes
// the password. A wrong one is a 400 on its field, not a 401: the apps take a 401 for an
// expired session, renew it and send the same request again, spending two attempts on
// each mistake.
export const assertCurrentPassword = async (user, currentPassword) => {
    const isCurrentPasswordValid = typeof currentPassword === "string"
        && await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) throw new ValidationError("Current password is incorrect", CURRENT_PASSWORD_FIELD);
};
