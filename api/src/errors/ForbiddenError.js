import { BaseError } from "./BaseError.js";

export class ForbiddenError extends BaseError {
    constructor(message = "Forbidden", field = null) {
        super(message, 403);
        this.field = field;
    }
}
