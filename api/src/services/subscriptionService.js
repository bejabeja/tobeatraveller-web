import { NotFoundError } from '../errors/NotFoundError.js';
import { ConflictError } from '../errors/ConflictError.js';
import { AUDIT_EVENTS } from '../utils/auditEvents.js';
import { ACTIVE_SUBSCRIPTION_STATUSES, ENDED_SUBSCRIPTION_STATUSES } from '../models/subscription.js';
import config from '../config/config.js';

const PRICE_IDS_BY_PLAN = {
    monthly: config.stripePriceIdMonthly,
    annual: config.stripePriceIdAnnual,
};

// Advertised on the subscription page's main CTA ("Prueba Premium gratis 7
// días"), so Checkout must actually grant it. Only for a user's first ever
// subscription, otherwise cancelling and resubscribing would be a free
// premium loophole.
const FREE_TRIAL_DAYS = 7;
// By default Stripe invoices when a trial ends with no card, fails, and keeps
// retrying with "payment failed" emails to someone who never entered a card.
const TRIAL_SUBSCRIPTION_DATA = {
    trial_period_days: FREE_TRIAL_DAYS,
    trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
};

// A past_due subscription does not extend premiumUntil (the period that failed
// to be paid is not granted); this is how long Premium lasts from the failure,
// so the customer can see it and fix the card.
const PAYMENT_FAILED_GRACE_DAYS = 3;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// Recent Stripe API versions moved current_period_end from the subscription
// itself to its first item (a subscription can have several items, each with
// its own billing period), but a single-price subscription like ours still
// has exactly one. Reading both keeps this working across API versions.
const currentPeriodEndOf = (subscription) => {
    const epochSeconds = subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end;
    return new Date(epochSeconds * 1000);
};

// A cancellation made through the Stripe Dashboard or Customer Portal sets
// `cancel_at` (a specific timestamp) and `canceled_at`/`cancellation_details`,
// while `cancel_at_period_end` itself stays false; only a subscription
// updated programmatically via `cancel_at_period_end: true` sets that flag
// directly. Both mean the same thing to us (won't renew, access lasts until
// the period ends), so a scheduled cancellation must check both.
const isScheduledToCancel = (subscription) => !!(subscription.cancel_at_period_end || subscription.cancel_at);

export class SubscriptionService {
    constructor(subscriptionRepository, userRepository, auditLogService, stripeClient) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.stripeClient = stripeClient;
    }

    async createCheckoutSession(userId, plan, { startTrial = true } = {}) {
        const user = await this.userRepository.getUserById(userId);
        if (!user) throw new NotFoundError('User not found');

        const existingSubscriptions = await this.subscriptionRepository.findByUserId(user.id);
        // Without this guard, a double click or a retried request in the gap
        // between paying and the webhook flipping the user to premium could
        // create a second Stripe subscription and charge the user twice.
        if (existingSubscriptions.some((subscription) => ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status))) {
            throw new ConflictError('You already have an active subscription');
        }
        // Still alive and waiting for a payment (past_due, unpaid, paused): a
        // second subscription would end up charging twice. What this customer
        // needs is to fix the payment method.
        const hasSubscriptionWaitingForPayment = existingSubscriptions.some((subscription) => (
            !ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status) && !ENDED_SUBSCRIPTION_STATUSES.includes(subscription.status)
        ));
        if (hasSubscriptionWaitingForPayment) {
            return { ...(await this.createPortalSession(user.id)), kind: 'billing_portal' };
        }

        const customerId = user.stripeCustomerId ?? await this._createStripeCustomer(user);
        const isFirstSubscription = existingSubscriptions.length === 0;

        const session = await this.stripeClient.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: PRICE_IDS_BY_PLAN[plan], quantity: 1 }],
            subscription_data: isFirstSubscription && startTrial ? TRIAL_SUBSCRIPTION_DATA : undefined,
            // Only skips card collection when nothing is due today, which is
            // exactly the free trial case (amount due $0); a resubscribe with
            // no trial still owes the full price immediately, so Stripe still
            // asks for a card then. A trial that ends with no card on file is
            // canceled (see TRIAL_SUBSCRIPTION_DATA), so premiumUntil expires
            // on schedule and requirePremium reverts the user to free.
            payment_method_collection: 'if_required',
            success_url: `${config.appUrl}/subscription?checkout=success`,
            cancel_url: `${config.appUrl}/subscription?checkout=cancel`,
        });

        return { url: session.url, kind: 'checkout' };
    }

    async getMySubscription(userId) {
        const [subscription] = await this.subscriptionRepository.findByUserId(userId);
        return subscription ? subscription.toDTO() : null;
    }

    async resumeSubscription(userId) {
        const [subscription] = await this.subscriptionRepository.findByUserId(userId);
        if (!subscription?.cancelAtPeriodEnd) {
            throw new ConflictError('No pending cancellation to resume');
        }

        const resumed = await this.stripeClient.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: false,
        });

        // Reflects the change locally right away instead of waiting on the
        // customer.subscription.updated webhook round-trip, so the page can
        // show the resumed state immediately; the webhook still arrives and
        // is a harmless no-op update over the same values. Reads the result
        // of the update call itself (not the pre-update local row) since a
        // cancellation scheduled via `cancel_at` rather than
        // `cancel_at_period_end` (e.g. from the Dashboard) needs verifying
        // that this call actually cleared it, not just assumed.
        const updated = await this.subscriptionRepository.updateByStripeSubscriptionId(subscription.stripeSubscriptionId, {
            status: resumed.status,
            currentPeriodEnd: currentPeriodEndOf(resumed),
            cancelAtPeriodEnd: isScheduledToCancel(resumed),
        });

        // The webhook that follows finds the row already updated, so it would
        // never see this change: this is the one that records it.
        if (!updated.cancelAtPeriodEnd) {
            const user = await this.userRepository.getUserById(userId);
            this.auditLogService?.log({
                action: AUDIT_EVENTS.SUBSCRIPTION_RESUMED,
                targetUserId: userId, targetUsername: user?.username,
                metadata: { stripeSubscriptionId: subscription.stripeSubscriptionId, status: resumed.status },
            });
        }

        return updated.toDTO();
    }

    async createPortalSession(userId) {
        const user = await this.userRepository.getUserById(userId);
        if (!user?.stripeCustomerId) throw new NotFoundError('No subscription found for this user');

        const session = await this.stripeClient.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${config.appUrl}/subscription`,
        });

        return { url: session.url };
    }

    verifyWebhookEvent(payload, signature) {
        return this.stripeClient.webhooks.constructEvent(payload, signature, config.stripeWebhookSecret);
    }

    async handleWebhookEvent(event) {
        switch (event.type) {
            case 'checkout.session.completed':
                return this._handleCheckoutCompleted(event.data.object);
            case 'customer.subscription.updated':
                return this._handleSubscriptionUpdated(event.data.object, event.created);
            case 'customer.subscription.deleted':
                return this._handleSubscriptionDeleted(event.data.object);
            default:
                return;
        }
    }

    async _createStripeCustomer(user) {
        const customer = await this.stripeClient.customers.create({
            email: user.email,
            metadata: { userId: user.id },
        });

        const updated = await this.userRepository.setStripeCustomerIdIfUnset(user.id, customer.id);
        if (updated) return customer.id;

        // Lost the race to a concurrent request that set stripe_customer_id
        // first: use that one instead of the customer just created here, so
        // the user never ends up split across two Stripe customers.
        const current = await this.userRepository.getUserById(user.id);
        return current.stripeCustomerId;
    }

    async _handleCheckoutCompleted(session) {
        if (session.mode !== 'subscription' || !session.subscription) return;

        // Stripe delivers webhooks at-least-once and retries on any non-2xx
        // response or timeout, so a retried delivery of an event already
        // processed must be a no-op instead of hitting the UNIQUE constraint
        // on stripe_subscription_id.
        const alreadyProcessed = await this.subscriptionRepository.findByStripeSubscriptionId(session.subscription);
        if (alreadyProcessed) return;

        const user = await this.userRepository.findByStripeCustomerId(session.customer);
        if (!user) return;

        const subscription = await this.stripeClient.subscriptions.retrieve(session.subscription);
        const currentPeriodEnd = currentPeriodEndOf(subscription);

        await this.subscriptionRepository.create({
            userId: user.id,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd,
            cancelAtPeriodEnd: isScheduledToCancel(subscription),
        });
        await this._syncPremiumUntil(user.id, currentPeriodEnd);

        this.auditLogService?.log({
            action: AUDIT_EVENTS.SUBSCRIPTION_STARTED,
            targetUserId: user.id, targetUsername: user.username,
            metadata: { stripeSubscriptionId: subscription.id, status: subscription.status },
        });
    }

    async _handleSubscriptionUpdated(subscription, eventCreatedSeconds) {
        const existing = await this.subscriptionRepository.findByStripeSubscriptionId(subscription.id);
        if (!existing) return;

        const currentPeriodEnd = currentPeriodEndOf(subscription);
        const cancelAtPeriodEnd = isScheduledToCancel(subscription);

        // Like the audit below, before the row changes: a retry only knows this
        // is the first failure while the stored row is still the old one.
        if (subscription.status === 'past_due' && existing.status !== 'past_due') {
            await this._grantPaymentFailedGrace(existing, eventCreatedSeconds);
        }

        // Resolved and logged before the row changes: Stripe delivers at least
        // once, and a retry recomputes the same transitions only while the
        // stored row is still the old one. A rare duplicate entry after a
        // failed update is better than a transition lost for good.
        const transitions = this._transitionActions(existing, subscription.status, cancelAtPeriodEnd);
        if (transitions.length) {
            const user = await this.userRepository.getUserById(existing.userId);
            transitions.forEach((action) => this.auditLogService?.log({
                action,
                targetUserId: existing.userId, targetUsername: user?.username,
                metadata: { stripeSubscriptionId: subscription.id, status: subscription.status },
            }));
        }

        await this.subscriptionRepository.updateByStripeSubscriptionId(subscription.id, {
            status: subscription.status,
            currentPeriodEnd,
            cancelAtPeriodEnd,
        });

        if (ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
            await this._syncPremiumUntil(existing.userId, currentPeriodEnd);
        }
    }

    // Counted from when Stripe reported the failure, so a late delivery does not
    // stretch it. Stripe can roll the period forward while the subscription is
    // still active, before the payment is attempted: what that extended for this
    // subscription is taken back to the grace, but a Premium that reaches further
    // for another reason (a gift, a reward) is left alone.
    async _grantPaymentFailedGrace(existing, eventCreatedSeconds) {
        const failedAt = eventCreatedSeconds ? new Date(eventCreatedSeconds * 1000) : new Date();
        const graceEnd = new Date(failedAt.getTime() + PAYMENT_FAILED_GRACE_DAYS * MILLISECONDS_PER_DAY);

        const user = await this.userRepository.getUserById(existing.userId);
        const premiumUntil = user?.premiumUntil ? new Date(user.premiumUntil) : null;
        const extendedByThisSubscription = premiumUntil && existing.currentPeriodEnd
            && premiumUntil.getTime() === new Date(existing.currentPeriodEnd).getTime();
        if (premiumUntil && premiumUntil > graceEnd && !extendedByThisSubscription) return;

        await this.userRepository.updatePremiumUntil(existing.userId, graceEnd);
    }

    // Only changes from what was stored, so a redelivered event does not log
    // twice; one event can carry several of them.
    _transitionActions(existing, status, cancelAtPeriodEnd) {
        const actions = [];
        if (!existing.cancelAtPeriodEnd && cancelAtPeriodEnd) actions.push(AUDIT_EVENTS.SUBSCRIPTION_CANCELLATION_SCHEDULED);
        if (existing.cancelAtPeriodEnd && !cancelAtPeriodEnd) actions.push(AUDIT_EVENTS.SUBSCRIPTION_RESUMED);
        if (existing.status === 'trialing' && status === 'active') actions.push(AUDIT_EVENTS.SUBSCRIPTION_TRIAL_CONVERTED);
        if (existing.status !== 'past_due' && status === 'past_due') actions.push(AUDIT_EVENTS.SUBSCRIPTION_PAYMENT_FAILED);
        return actions;
    }

    async _handleSubscriptionDeleted(subscription) {
        const existing = await this.subscriptionRepository.findByStripeSubscriptionId(subscription.id);
        if (!existing || existing.status === 'canceled') return;

        await this.subscriptionRepository.updateByStripeSubscriptionId(subscription.id, {
            status: 'canceled',
            currentPeriodEnd: existing.currentPeriodEnd,
            cancelAtPeriodEnd: true,
        });
        await this._syncPremiumUntil(existing.userId, new Date());

        const user = await this.userRepository.getUserById(existing.userId);
        this.auditLogService?.log({
            action: AUDIT_EVENTS.SUBSCRIPTION_CANCELED,
            targetUserId: existing.userId, targetUsername: user?.username,
            metadata: { stripeSubscriptionId: subscription.id, previousStatus: existing.status },
        });
    }

    // Never moves premiumUntil backward from whatever is already stored: a
    // superadmin's manual grant (userService.js updateUserTier) has no
    // subscriptions row of its own, so a Stripe event for an unrelated
    // subscription must not shorten or clear it. Only applies when the
    // stored value doesn't already reach further than what this event grants.
    async _syncPremiumUntil(userId, premiumUntil) {
        const user = await this.userRepository.getUserById(userId);
        if (user?.premiumUntil && new Date(user.premiumUntil) > premiumUntil) return;

        await this.userRepository.updatePremiumUntil(userId, premiumUntil);
    }
}
