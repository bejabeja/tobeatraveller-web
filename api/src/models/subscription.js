// The statuses that keep premium on: paid, or in its free trial.
export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];

// Over for good: any other status (past_due, unpaid, paused) can still be
// revived by paying, so it is not a reason to start a second subscription.
export const ENDED_SUBSCRIPTION_STATUSES = ['canceled', 'incomplete_expired'];

export class Subscription {
    constructor({ id, userId, stripeSubscriptionId, status, currentPeriodEnd, cancelAtPeriodEnd, createdAt, updatedAt }) {
        this.id = id;
        this.userId = userId;
        this.stripeSubscriptionId = stripeSubscriptionId;
        this.status = status;
        this.currentPeriodEnd = currentPeriodEnd;
        this.cancelAtPeriodEnd = cancelAtPeriodEnd;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromDb(row) {
        return new Subscription({
            id: row.id,
            userId: row.user_id,
            stripeSubscriptionId: row.stripe_subscription_id,
            status: row.status,
            currentPeriodEnd: row.current_period_end,
            cancelAtPeriodEnd: row.cancel_at_period_end,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }

    toDTO() {
        return {
            id: this.id,
            userId: this.userId,
            status: this.status,
            currentPeriodEnd: this.currentPeriodEnd,
            cancelAtPeriodEnd: this.cancelAtPeriodEnd,
        };
    }
}
