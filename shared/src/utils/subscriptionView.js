// Which card the subscription page shows, decided in one place so the web and
// the app cannot disagree. `subscription` is the Stripe-backed row, which a
// Premium user can lack (a gift, a referral reward): then Premium comes from
// `premiumUntil` alone and there is no billing to manage.
//
// `subscriptionState`: "loading" until the row is known, "loaded", or "failed"
// when it could not be read (a paying customer may be behind that).
//
// After paying, `activating` is the wait for the webhook and `activationStalled`
// is that wait running out: the plans are not shown again either way, as the
// customer has already paid.

// A subscription in any other status (canceled, unpaid, expired) is over: the
// user is Premium for another reason.
const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'];

export const getPremiumView = ({ isPremium, activating = false, activationStalled = false, subscription, subscriptionState, premiumUntil }) => {
    if (!isPremium) {
        if (activating) return { kind: 'activating' };
        return { kind: activationStalled ? 'activationDelayed' : 'plans' };
    }
    if (subscriptionState === 'loading') return { kind: 'loading' };

    if (subscription && LIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
        const date = subscription.currentPeriodEnd;
        if (subscription.status === 'past_due') return { kind: 'paymentFailed' };
        if (subscription.cancelAtPeriodEnd) return { kind: subscription.status === 'trialing' ? 'trialCanceled' : 'canceled', date };
        if (subscription.status === 'trialing') return { kind: 'trial', date };
        return { kind: 'active', date };
    }
    if (subscriptionState !== 'failed' && premiumUntil) return { kind: 'granted', date: premiumUntil };
    return { kind: 'unknown' };
};
