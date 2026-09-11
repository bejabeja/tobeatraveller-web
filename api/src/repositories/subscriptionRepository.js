import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { Subscription } from '../models/subscription.js';

export class SubscriptionRepository {
    async create({ userId, stripeSubscriptionId, status, currentPeriodEnd, cancelAtPeriodEnd }) {
        const id = uuidv4();

        const result = await client.query(
            `INSERT INTO subscriptions (id, user_id, stripe_subscription_id, status, current_period_end, cancel_at_period_end)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [id, userId, stripeSubscriptionId, status, currentPeriodEnd, cancelAtPeriodEnd ?? false]
        );

        return Subscription.fromDb(result.rows[0]);
    }

    async findByStripeSubscriptionId(stripeSubscriptionId) {
        const result = await client.query(
            `SELECT * FROM subscriptions WHERE stripe_subscription_id = $1`,
            [stripeSubscriptionId]
        );
        return result.rows.length ? Subscription.fromDb(result.rows[0]) : null;
    }

    async updateByStripeSubscriptionId(stripeSubscriptionId, { status, currentPeriodEnd, cancelAtPeriodEnd }) {
        const result = await client.query(
            `UPDATE subscriptions
             SET status = $1, current_period_end = $2, cancel_at_period_end = $3, updated_at = CURRENT_TIMESTAMP
             WHERE stripe_subscription_id = $4
             RETURNING *`,
            [status, currentPeriodEnd, cancelAtPeriodEnd ?? false, stripeSubscriptionId]
        );
        return result.rows.length ? Subscription.fromDb(result.rows[0]) : null;
    }

    async findByUserId(userId) {
        const result = await client.query(
            `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        return result.rows.map(Subscription.fromDb);
    }

    async hasAnySubscription(userId) {
        const result = await client.query(
            `SELECT EXISTS(SELECT 1 FROM subscriptions WHERE user_id = $1) AS exists`,
            [userId]
        );
        return result.rows[0].exists;
    }
}
