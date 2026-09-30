import { describe, expect, it } from 'vitest';
import { getPremiumView } from '../../utils/subscriptionView.js';

const IN_TWO_WEEKS = '2026-10-13T00:00:00.000Z';
const PREMIUM_UNTIL = '2026-12-28T00:00:00.000Z';
const subscription = (overrides = {}) => ({ status: 'active', currentPeriodEnd: IN_TWO_WEEKS, cancelAtPeriodEnd: false, ...overrides });
const view = (overrides = {}) => getPremiumView({
    isPremium: true, subscription: subscription(), subscriptionState: 'loaded', premiumUntil: PREMIUM_UNTIL, ...overrides,
});

describe('getPremiumView', () => {
    it('shows the plans to someone who is not Premium', () => {
        expect(view({ isPremium: false, subscription: null }).kind).toBe('plans');
    });

    it('says the Premium is being activated after paying, until it arrives', () => {
        expect(view({ isPremium: false, subscription: null, activating: true }).kind).toBe('activating');
    });

    // Regression: the plans came back after the wait, inviting someone who had
    // just paid to pay again.
    it('does not sell Premium again when the activation is late after paying', () => {
        expect(view({ isPremium: false, subscription: null, activationStalled: true }).kind).toBe('activationDelayed');
    });

    it('goes back to waiting when the activation is being checked again', () => {
        expect(view({ isPremium: false, subscription: null, activating: true, activationStalled: true }).kind).toBe('activating');
    });

    it('stops saying so once the user is Premium', () => {
        expect(view({ activating: true }).kind).toBe('active');
    });

    it('waits for the subscription instead of guessing a state that will change', () => {
        expect(view({ subscription: null, subscriptionState: 'loading' }).kind).toBe('loading');
    });

    it('gives the renewal date of a paying customer', () => {
        expect(view()).toEqual({ kind: 'active', date: IN_TWO_WEEKS });
    });

    it('recognises a free trial and when it ends', () => {
        expect(view({ subscription: subscription({ status: 'trialing' }) })).toEqual({ kind: 'trial', date: IN_TWO_WEEKS });
    });

    it('recognises a canceled subscription and until when Premium lasts', () => {
        expect(view({ subscription: subscription({ cancelAtPeriodEnd: true }) })).toEqual({ kind: 'canceled', date: IN_TWO_WEEKS });
    });

    it('tells a canceled trial apart from a canceled paid subscription', () => {
        const trialCanceled = view({ subscription: subscription({ status: 'trialing', cancelAtPeriodEnd: true }) });

        expect(trialCanceled).toEqual({ kind: 'trialCanceled', date: IN_TWO_WEEKS });
    });

    it('recognises a failed payment', () => {
        expect(view({ subscription: subscription({ status: 'past_due' }) }).kind).toBe('paymentFailed');
    });

    // Regression: a gift or a referral reward has no Stripe customer, so the
    // billing portal failed for it.
    it('recognises Premium that came without a subscription, and until when', () => {
        expect(view({ subscription: null })).toEqual({ kind: 'granted', date: PREMIUM_UNTIL });
    });

    // Regression: a subscription that already ended is not a pending
    // cancellation; when Premium comes back through a gift or a reward, the page
    // offered to "resume" something Stripe no longer has.
    it('ignores a subscription that already ended when Premium comes from a grant', () => {
        const ended = subscription({ status: 'canceled', cancelAtPeriodEnd: true });

        expect(view({ subscription: ended })).toEqual({ kind: 'granted', date: PREMIUM_UNTIL });
    });

    it('does not rule out billing when the subscription could not be read', () => {
        expect(view({ subscription: null, subscriptionState: 'failed' }).kind).toBe('unknown');
    });

    it('does not claim a date it does not have', () => {
        expect(view({ subscription: null, premiumUntil: null }).kind).toBe('unknown');
    });
});
