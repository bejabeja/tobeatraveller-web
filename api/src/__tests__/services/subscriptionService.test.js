import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SubscriptionService } from '../../services/subscriptionService.js';
import config from '../../config/config.js';

const makeUser = (overrides = {}) => ({
    id: 'user-1',
    username: 'miriam',
    email: 'miriam@example.com',
    stripeCustomerId: null,
    ...overrides,
});

const makeStripeSubscription = (overrides = {}) => ({
    id: 'sub_123',
    status: 'active',
    cancel_at_period_end: false,
    current_period_end: 1893456000, // 2030-01-01T00:00:00Z
    ...overrides,
});

const makeSubscriptionRow = (overrides = {}) => ({
    id: 'local-sub-1',
    userId: 'user-1',
    stripeSubscriptionId: 'sub_123',
    status: 'active',
    currentPeriodEnd: new Date('2030-01-01'),
    cancelAtPeriodEnd: false,
    toDTO() {
        return { id: this.id, userId: this.userId, status: this.status, currentPeriodEnd: this.currentPeriodEnd, cancelAtPeriodEnd: this.cancelAtPeriodEnd };
    },
    ...overrides,
});

describe('SubscriptionService', () => {
    let subscriptionRepository;
    let userRepository;
    let auditLogService;
    let stripeClient;
    let emailService;
    let service;

    beforeEach(() => {
        subscriptionRepository = {
            create: vi.fn(async (data) => ({ id: 'local-sub-1', ...data })),
            findByStripeSubscriptionId: vi.fn(async () => null),
            updateByStripeSubscriptionId: vi.fn(async (stripeSubscriptionId, data) => makeSubscriptionRow({ stripeSubscriptionId, ...data })),
            findByUserId: vi.fn(async () => []),
            findTrialsEndingBefore: vi.fn(async () => []),
            claimTrialReminder: vi.fn(async () => true),
            releaseTrialReminder: vi.fn(async () => {}),
        };
        userRepository = {
            getUserById: vi.fn(async () => makeUser()),
            findByStripeCustomerId: vi.fn(async () => makeUser({ stripeCustomerId: 'cus_123' })),
            setStripeCustomerIdIfUnset: vi.fn(async () => makeUser({ stripeCustomerId: 'cus_123' })),
            updatePremiumUntil: vi.fn(async () => {}),
        };
        auditLogService = { log: vi.fn() };
        stripeClient = {
            customers: { create: vi.fn(async () => ({ id: 'cus_123' })) },
            checkout: { sessions: { create: vi.fn(async () => ({ url: 'https://checkout.stripe.com/session-1' })) } },
            billingPortal: { sessions: { create: vi.fn(async () => ({ url: 'https://billing.stripe.com/portal-1' })) } },
            subscriptions: {
                retrieve: vi.fn(async () => makeStripeSubscription()),
                update: vi.fn(async () => makeStripeSubscription({ cancel_at_period_end: false })),
                cancel: vi.fn(async () => makeStripeSubscription({ status: 'canceled' })),
            },
            charges: { retrieve: vi.fn(async () => ({ id: 'ch_1', customer: 'cus_123' })) },
            webhooks: { constructEvent: vi.fn() },
        };
        emailService = {
            sendTrialEnding: vi.fn(async () => {}),
            sendTrialEnded: vi.fn(async () => {}),
        };
        service = new SubscriptionService(subscriptionRepository, userRepository, auditLogService, stripeClient, emailService);
    });

    describe('createCheckoutSession()', () => {
        it('throws NotFoundError when the user does not exist', async () => {
            userRepository.getUserById.mockResolvedValue(null);

            await expect(service.createCheckoutSession('missing', 'monthly')).rejects.toThrow('User not found');
        });

        it('creates a Stripe customer and stores it when the user has none yet', async () => {
            const { url } = await service.createCheckoutSession('user-1', 'monthly');

            expect(stripeClient.customers.create).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'miriam@example.com' })
            );
            expect(userRepository.setStripeCustomerIdIfUnset).toHaveBeenCalledWith('user-1', 'cus_123');
            expect(url).toBe('https://checkout.stripe.com/session-1');
        });

        it('uses the customer a concurrent request already persisted when it loses the race', async () => {
            userRepository.setStripeCustomerIdIfUnset.mockResolvedValue(null);
            userRepository.getUserById
                .mockResolvedValueOnce(makeUser({ stripeCustomerId: null }))
                .mockResolvedValueOnce(makeUser({ stripeCustomerId: 'cus_winner' }));

            await service.createCheckoutSession('user-1', 'monthly');

            expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
                expect.objectContaining({ customer: 'cus_winner' })
            );
        });

        it('reuses the existing Stripe customer instead of creating a new one', async () => {
            userRepository.getUserById.mockResolvedValue(makeUser({ stripeCustomerId: 'cus_existing' }));

            await service.createCheckoutSession('user-1', 'annual');

            expect(stripeClient.customers.create).not.toHaveBeenCalled();
            expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
                expect.objectContaining({ customer: 'cus_existing', mode: 'subscription' })
            );
        });

        it('throws ConflictError when the user already has an active subscription', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ status: 'active' })]);

            await expect(service.createCheckoutSession('user-1', 'monthly')).rejects.toThrow('You already have an active subscription');
            expect(stripeClient.checkout.sessions.create).not.toHaveBeenCalled();
        });

        it('throws ConflictError when the user already has a trialing subscription', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ status: 'trialing' })]);

            await expect(service.createCheckoutSession('user-1', 'monthly')).rejects.toThrow('You already have an active subscription');
        });

        // Regression: only active and trialing counted, so someone whose renewal
        // failed could subscribe again while Stripe was still retrying the first
        // one, and end up with two subscriptions charging.
        it.each(['past_due', 'unpaid', 'paused'])('sends someone with a %s subscription to the billing portal instead of creating a second one', async (status) => {
            userRepository.getUserById.mockResolvedValue(makeUser({ stripeCustomerId: 'cus_123' }));
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ status })]);

            const result = await service.createCheckoutSession('user-1', 'monthly');

            expect(result).toEqual({ url: 'https://billing.stripe.com/portal-1', kind: 'billing_portal' });
            expect(stripeClient.checkout.sessions.create).not.toHaveBeenCalled();
        });

        it('says it is a checkout when it is one', async () => {
            const result = await service.createCheckoutSession('user-1', 'monthly');

            expect(result).toEqual({ url: 'https://checkout.stripe.com/session-1', kind: 'checkout' });
        });

        it('allows checking out again when the previous subscription expired before being paid', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ status: 'incomplete_expired' })]);

            const { kind } = await service.createCheckoutSession('user-1', 'monthly');

            expect(kind).toBe('checkout');
        });

        it('allows checking out again when the previous subscription was canceled', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ status: 'canceled' })]);

            const { url } = await service.createCheckoutSession('user-1', 'monthly');

            expect(url).toBe('https://checkout.stripe.com/session-1');
        });

        it('grants a 7-day free trial on a user\'s first subscription', async () => {
            await service.createCheckoutSession('user-1', 'monthly');

            expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
                expect.objectContaining({ subscription_data: expect.objectContaining({ trial_period_days: 7 }) })
            );
        });

        // Regression: by default Stripe invoices at the end of a trial without
        // a card, fails, and keeps retrying with "payment failed" emails to
        // someone who never entered a card.
        it('ends a trial that has no card by canceling, instead of failing invoices', async () => {
            await service.createCheckoutSession('user-1', 'monthly');

            const { subscription_data: subscriptionData } = stripeClient.checkout.sessions.create.mock.calls[0][0];
            expect(subscriptionData.trial_settings).toEqual({ end_behavior: { missing_payment_method: 'cancel' } });
        });

        // The right of withdrawal is lost only if the customer asked for the
        // service to start right away and acknowledged it: an explicit act, taken on
        // the Stripe page right before paying, where the payment button is.
        describe('consent to start right away', () => {
            const sessionParams = () => stripeClient.checkout.sessions.create.mock.calls[0][0];

            it('asks Stripe to make the customer accept the terms when charging right away', async () => {
                await service.createCheckoutSession('user-1', 'annual', { startTrial: false });

                expect(sessionParams().consent_collection).toEqual({ terms_of_service: 'required' });
                expect(sessionParams().custom_text.terms_of_service_acceptance.message).toContain('/terms');
            });

            it('says it in the language of the customer, and lets Stripe show its page in it', async () => {
                userRepository.getUserById.mockResolvedValue(makeUser({ language: 'es' }));

                await service.createCheckoutSession('user-1', 'annual', { startTrial: false });

                expect(sessionParams().locale).toBe('es');
                expect(sessionParams().custom_text.terms_of_service_acceptance.message).toContain('derecho de desistimiento');
            });

            it('falls back to English for a language it has no text in', async () => {
                userRepository.getUserById.mockResolvedValue(makeUser({ language: 'pt' }));

                await service.createCheckoutSession('user-1', 'annual', { startTrial: false });

                expect(sessionParams().locale).toBe('en');
                expect(sessionParams().custom_text.terms_of_service_acceptance.message).toContain('right of withdrawal');
            });

            it('also asks for it from someone with no trial left, who is charged right away', async () => {
                subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ status: 'canceled' })]);

                await service.createCheckoutSession('user-1', 'monthly');

                expect(sessionParams().consent_collection).toEqual({ terms_of_service: 'required' });
            });

            it('does not ask for it to start a free trial, where nothing is charged', async () => {
                await service.createCheckoutSession('user-1', 'monthly');

                expect(sessionParams().consent_collection).toBeUndefined();
                expect(sessionParams().custom_text).toBeUndefined();
            });
        });

        // Stripe Tax needs the Stripe account set up first (head office address,
        // registrations, tax behavior on the prices): without it Checkout refuses to
        // start, so collecting taxes is switched on by configuration.
        describe('taxes', () => {
            const sessionParams = () => stripeClient.checkout.sessions.create.mock.calls[0][0];
            afterEach(() => { config.stripeAutomaticTax = false; });

            it('lets Stripe calculate and collect the taxes when it is switched on', async () => {
                config.stripeAutomaticTax = true;

                await service.createCheckoutSession('user-1', 'annual');

                expect(sessionParams().automatic_tax).toEqual({ enabled: true });
            });

            it('keeps the customer address Stripe collects for it, which the tax of the next invoices depends on', async () => {
                config.stripeAutomaticTax = true;

                await service.createCheckoutSession('user-1', 'annual');

                expect(sessionParams().customer_update).toEqual({ address: 'auto' });
            });

            it('asks Stripe for nothing about taxes while it is switched off, the default', async () => {
                await service.createCheckoutSession('user-1', 'annual');

                expect(sessionParams().automatic_tax).toBeUndefined();
                expect(sessionParams().customer_update).toBeUndefined();
            });
        });

        // Someone who already knows they want Premium should be able to pay now
        // instead of being pushed to a trial that ends on the free plan.
        it('does not grant the trial when the user chooses to subscribe right away', async () => {
            await service.createCheckoutSession('user-1', 'monthly', { startTrial: false });

            expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
                expect.objectContaining({ subscription_data: undefined })
            );
        });

        it('grants the trial by default, as clients that do not say anything expect', async () => {
            await service.createCheckoutSession('user-1', 'monthly');

            const { subscription_data: subscriptionData } = stripeClient.checkout.sessions.create.mock.calls[0][0];
            expect(subscriptionData.trial_period_days).toBe(7);
        });

        it('does not grant a trial when the user has subscribed before', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ id: 'past-sub', status: 'canceled' })]);

            await service.createCheckoutSession('user-1', 'monthly');

            expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
                expect.objectContaining({ subscription_data: undefined })
            );
        });

        it('does not force card collection upfront, so the free trial has no payment method friction', async () => {
            await service.createCheckoutSession('user-1', 'monthly');

            expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
                expect.objectContaining({ payment_method_collection: 'if_required' })
            );
        });
    });

    describe('handleWebhookEvent() / refunds and disputes', () => {
        const activeRow = (overrides = {}) => makeSubscriptionRow({ status: 'active', ...overrides });
        const refund = (overrides = {}) => service.handleWebhookEvent({
            type: 'charge.refunded',
            data: { object: { id: 'ch_1', customer: 'cus_123', refunded: true, amount_refunded: 299, ...overrides } },
        });

        beforeEach(() => {
            subscriptionRepository.findByUserId.mockResolvedValue([activeRow()]);
        });

        it('ends the subscription right away when the payment is fully refunded', async () => {
            await refund();

            expect(stripeClient.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
        });

        it('records why the Premium ended', async () => {
            await refund();

            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'subscription_refunded', targetUserId: 'user-1',
                metadata: { stripeSubscriptionId: 'sub_123', chargeId: 'ch_1' },
            }));
        });

        it('keeps the Premium of someone who was only partly refunded, a goodwill gesture', async () => {
            await refund({ refunded: false, amount_refunded: 100 });

            expect(stripeClient.subscriptions.cancel).not.toHaveBeenCalled();
        });

        it('does nothing when there is no live subscription left to end, so a redelivery does not repeat it', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([activeRow({ status: 'canceled' })]);

            await refund();

            expect(stripeClient.subscriptions.cancel).not.toHaveBeenCalled();
            expect(auditLogService.log).not.toHaveBeenCalled();
        });

        it('ignores a charge of a customer it does not know', async () => {
            userRepository.findByStripeCustomerId.mockResolvedValue(null);

            await refund();

            expect(stripeClient.subscriptions.cancel).not.toHaveBeenCalled();
        });

        it('ends the subscription when the customer disputes the payment', async () => {
            await service.handleWebhookEvent({
                type: 'charge.dispute.created',
                data: { object: { id: 'dp_1', charge: 'ch_1' } },
            });

            expect(stripeClient.charges.retrieve).toHaveBeenCalledWith('ch_1');
            expect(stripeClient.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'subscription_disputed',
                metadata: { stripeSubscriptionId: 'sub_123', chargeId: 'ch_1', disputeId: 'dp_1' },
            }));
        });

        it('does not swallow a Stripe failure, so the event is delivered again and the subscription still ends', async () => {
            stripeClient.subscriptions.cancel.mockRejectedValue(new Error('stripe down'));

            await expect(refund()).rejects.toThrow('stripe down');
        });
    });

    describe('closeBillingAccount()', () => {
        it('deletes the Stripe customer, which cancels its subscriptions right away', async () => {
            stripeClient.customers.del = vi.fn(async () => ({ deleted: true }));

            await service.closeBillingAccount(makeUser({ stripeCustomerId: 'cus_123' }));

            expect(stripeClient.customers.del).toHaveBeenCalledWith('cus_123');
        });

        it('does nothing for someone who never reached Stripe', async () => {
            stripeClient.customers.del = vi.fn();

            await service.closeBillingAccount(makeUser({ stripeCustomerId: null }));

            expect(stripeClient.customers.del).not.toHaveBeenCalled();
        });

        it('carries on when Stripe no longer has the customer', async () => {
            stripeClient.customers.del = vi.fn(async () => { throw Object.assign(new Error('No such customer'), { code: 'resource_missing' }); });

            await expect(service.closeBillingAccount(makeUser({ stripeCustomerId: 'cus_gone' }))).resolves.toBeUndefined();
        });

        it('does not swallow any other failure, so the account is not deleted with the billing still running', async () => {
            stripeClient.customers.del = vi.fn(async () => { throw new Error('stripe down'); });

            await expect(service.closeBillingAccount(makeUser({ stripeCustomerId: 'cus_123' }))).rejects.toThrow('stripe down');
        });
    });

    describe('getMySubscription()', () => {
        it('returns null when the user has never subscribed', async () => {
            const result = await service.getMySubscription('user-1');

            expect(result).toBeNull();
        });

        it('returns the most recent subscription as a DTO', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ status: 'trialing' })]);

            const result = await service.getMySubscription('user-1');

            expect(result).toEqual(expect.objectContaining({ status: 'trialing' }));
        });
    });

    describe('resumeSubscription()', () => {
        it('throws ConflictError when there is no pending cancellation', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ cancelAtPeriodEnd: false })]);

            await expect(service.resumeSubscription('user-1')).rejects.toThrow('No pending cancellation to resume');
        });

        it('throws ConflictError when the user has no subscription at all', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([]);

            await expect(service.resumeSubscription('user-1')).rejects.toThrow('No pending cancellation to resume');
        });

        it('clears cancel_at_period_end on Stripe and locally', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ cancelAtPeriodEnd: true })]);

            const result = await service.resumeSubscription('user-1');

            expect(stripeClient.subscriptions.update).toHaveBeenCalledWith('sub_123', { cancel_at_period_end: false });
            expect(subscriptionRepository.updateByStripeSubscriptionId).toHaveBeenCalledWith(
                'sub_123', expect.objectContaining({ cancelAtPeriodEnd: false })
            );
            expect(result.cancelAtPeriodEnd).toBe(false);
        });

        // The webhook that follows finds the row already updated, so it would
        // never see this change: the API is the one that has to record it.
        it('records that the user took the cancellation back', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ cancelAtPeriodEnd: true, status: 'trialing' })]);

            await service.resumeSubscription('user-1');

            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'subscription_resumed', targetUserId: 'user-1', metadata: { stripeSubscriptionId: 'sub_123', status: 'active' },
            }));
        });

        it('does not record a resume when Stripe kept the cancellation scheduled', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ cancelAtPeriodEnd: true })]);
            stripeClient.subscriptions.update.mockResolvedValue(
                makeStripeSubscription({ cancel_at_period_end: false, cancel_at: 1893456000 })
            );

            await service.resumeSubscription('user-1');

            expect(auditLogService.log).not.toHaveBeenCalled();
        });

        it('still reports a pending cancellation if Stripe did not actually clear cancel_at', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ cancelAtPeriodEnd: true })]);
            stripeClient.subscriptions.update.mockResolvedValue(
                makeStripeSubscription({ cancel_at_period_end: false, cancel_at: 1893456000 })
            );

            const result = await service.resumeSubscription('user-1');

            expect(result.cancelAtPeriodEnd).toBe(true);
        });
    });

    describe('createPortalSession()', () => {
        it('throws NotFoundError when the user has no Stripe customer yet', async () => {
            userRepository.getUserById.mockResolvedValue(makeUser({ stripeCustomerId: null }));

            await expect(service.createPortalSession('user-1')).rejects.toThrow('No subscription found for this user');
        });

        it('creates a billing portal session for the user\'s Stripe customer', async () => {
            userRepository.getUserById.mockResolvedValue(makeUser({ stripeCustomerId: 'cus_123' }));

            const { url } = await service.createPortalSession('user-1');

            expect(stripeClient.billingPortal.sessions.create).toHaveBeenCalledWith(
                expect.objectContaining({ customer: 'cus_123' })
            );
            expect(url).toBe('https://billing.stripe.com/portal-1');
        });
    });

    describe('handleWebhookEvent() / checkout.session.completed', () => {
        it('creates a subscription row and grants premium until the current period end', async () => {
            await service.handleWebhookEvent({
                type: 'checkout.session.completed',
                data: { object: { mode: 'subscription', subscription: 'sub_123', customer: 'cus_123' } },
            });

            expect(subscriptionRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user-1', stripeSubscriptionId: 'sub_123', status: 'active' })
            );
            expect(userRepository.updatePremiumUntil).toHaveBeenCalledWith('user-1', new Date(1893456000 * 1000));
            expect(auditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'subscription_started', targetUserId: 'user-1' })
            );
        });

        it('ignores checkout sessions that are not for a subscription', async () => {
            await service.handleWebhookEvent({
                type: 'checkout.session.completed',
                data: { object: { mode: 'payment', customer: 'cus_123' } },
            });

            expect(subscriptionRepository.create).not.toHaveBeenCalled();
        });

        it('does nothing when the Stripe customer is not linked to a known user', async () => {
            userRepository.findByStripeCustomerId.mockResolvedValue(null);

            await service.handleWebhookEvent({
                type: 'checkout.session.completed',
                data: { object: { mode: 'subscription', subscription: 'sub_123', customer: 'cus_unknown' } },
            });

            expect(subscriptionRepository.create).not.toHaveBeenCalled();
        });

        it('is a no-op on a retried delivery of an event already processed', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({ id: 'local-sub-1' });

            await service.handleWebhookEvent({
                type: 'checkout.session.completed',
                data: { object: { mode: 'subscription', subscription: 'sub_123', customer: 'cus_123' } },
            });

            expect(subscriptionRepository.create).not.toHaveBeenCalled();
            expect(stripeClient.subscriptions.retrieve).not.toHaveBeenCalled();
        });

        it('does not shorten a premiumUntil an admin already extended further out', async () => {
            const farFuture = new Date('2099-01-01');
            userRepository.getUserById.mockResolvedValue(makeUser({ premiumUntil: farFuture }));

            await service.handleWebhookEvent({
                type: 'checkout.session.completed',
                data: { object: { mode: 'subscription', subscription: 'sub_123', customer: 'cus_123' } },
            });

            expect(userRepository.updatePremiumUntil).not.toHaveBeenCalled();
        });
    });

    describe('handleWebhookEvent() / checkout.session.completed / terms', () => {
        const completed = (consent) => service.handleWebhookEvent({
            type: 'checkout.session.completed',
            data: { object: { mode: 'subscription', subscription: 'sub_123', customer: 'cus_123', consent } },
        });

        it('records that the customer accepted the terms on the Stripe page, and which version', async () => {
            await completed({ terms_of_service: 'accepted' });

            expect(auditLogService.log).toHaveBeenCalledWith({
                action: 'subscription_terms_accepted', targetUserId: 'user-1', targetUsername: 'miriam',
                metadata: { stripeSubscriptionId: 'sub_123', termsVersion: '2026-09-30' },
            });
        });

        it('records nothing when no terms were asked for, as with a free trial', async () => {
            await completed(null);

            expect(auditLogService.log).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'subscription_terms_accepted' }));
        });
    });

    describe('handleWebhookEvent() / customer.subscription.updated', () => {
        it('syncs the stored status and extends premium while the subscription stays active', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({ userId: 'user-1', stripeSubscriptionId: 'sub_123' });

            await service.handleWebhookEvent({
                type: 'customer.subscription.updated',
                data: { object: makeStripeSubscription({ status: 'active' }) },
            });

            expect(subscriptionRepository.updateByStripeSubscriptionId).toHaveBeenCalledWith(
                'sub_123', expect.objectContaining({ status: 'active' })
            );
            expect(userRepository.updatePremiumUntil).toHaveBeenCalledWith('user-1', new Date(1893456000 * 1000));
        });

        // Regression: Premium ended the moment a payment failed, while Stripe was
        // still retrying, so the "payment failed" card was never seen and the
        // plans were offered again.
        describe('when a payment fails', () => {
            const NOW = new Date('2030-06-01T12:00:00.000Z');
            const THREE_DAYS_LATER = new Date('2030-06-04T12:00:00.000Z');
            beforeEach(() => vi.useFakeTimers({ now: NOW }));
            afterEach(() => vi.useRealTimers());

            const pastDueUpdate = (existing = {}, event = {}) => {
                subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({
                    userId: 'user-1', stripeSubscriptionId: 'sub_123', status: 'active', cancelAtPeriodEnd: false, ...existing,
                });
                return service.handleWebhookEvent({
                    type: 'customer.subscription.updated',
                    data: { object: makeStripeSubscription({ status: 'past_due' }) },
                    ...event,
                });
            };

            it('keeps Premium for a few days while Stripe retries, instead of cutting it right away', async () => {
                userRepository.getUserById.mockResolvedValue(makeUser({ premiumUntil: new Date('2030-05-31') }));

                await pastDueUpdate();

                expect(userRepository.updatePremiumUntil).toHaveBeenCalledTimes(1);
                expect(userRepository.updatePremiumUntil).toHaveBeenCalledWith('user-1', THREE_DAYS_LATER);
            });

            it('gives only the grace, not the billing period that failed to be paid', async () => {
                userRepository.getUserById.mockResolvedValue(makeUser({ premiumUntil: new Date('2030-05-31') }));

                await pastDueUpdate({ status: 'trialing' });

                expect(userRepository.updatePremiumUntil.mock.calls).toEqual([['user-1', THREE_DAYS_LATER]]);
            });

            // Stripe can roll the period forward while the subscription is still
            // active, before the payment is attempted: Premium was already extended
            // to a period nobody has paid.
            it('takes back the period that was extended before the payment failed', async () => {
                const rolledPeriodEnd = new Date('2030-07-01T00:00:00.000Z');
                userRepository.getUserById.mockResolvedValue(makeUser({ premiumUntil: rolledPeriodEnd }));

                await pastDueUpdate({ currentPeriodEnd: rolledPeriodEnd });

                expect(userRepository.updatePremiumUntil.mock.calls).toEqual([['user-1', THREE_DAYS_LATER]]);
            });

            it('counts the grace from when Stripe reported the failure, not from when it is processed', async () => {
                userRepository.getUserById.mockResolvedValue(makeUser({ premiumUntil: new Date('2030-05-31') }));
                const failedAt = Date.parse('2030-06-01T00:00:00.000Z') / 1000;

                await pastDueUpdate({}, { created: failedAt });

                expect(userRepository.updatePremiumUntil).toHaveBeenCalledWith('user-1', new Date('2030-06-04T00:00:00.000Z'));
            });

            it('does not push the end of the grace forward on every retry Stripe reports', async () => {
                await pastDueUpdate({ status: 'past_due' });

                expect(userRepository.updatePremiumUntil).not.toHaveBeenCalled();
            });

            it('does not shorten a Premium that already reaches further for another reason', async () => {
                userRepository.getUserById.mockResolvedValue(makeUser({ premiumUntil: new Date('2099-01-01') }));

                await pastDueUpdate({ currentPeriodEnd: new Date('2030-07-01') });

                expect(userRepository.updatePremiumUntil).not.toHaveBeenCalled();
            });

            // Regression: the row was updated first, so when granting the grace failed,
            // Stripe's retry saw past_due already stored and never granted it.
            it('leaves the row untouched when the grace cannot be granted, so the retry still grants it', async () => {
                userRepository.getUserById.mockResolvedValue(makeUser({ premiumUntil: new Date('2030-05-31') }));
                userRepository.updatePremiumUntil.mockRejectedValue(new Error('db down'));

                await expect(pastDueUpdate()).rejects.toThrow('db down');

                expect(subscriptionRepository.updateByStripeSubscriptionId).not.toHaveBeenCalled();
            });
        });

        it('ignores updates for a subscription it has no local record of', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue(null);

            await service.handleWebhookEvent({
                type: 'customer.subscription.updated',
                data: { object: makeStripeSubscription() },
            });

            expect(subscriptionRepository.updateByStripeSubscriptionId).not.toHaveBeenCalled();
        });

        it('treats a Dashboard/Portal cancellation as scheduled even though cancel_at_period_end stays false', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({ userId: 'user-1', stripeSubscriptionId: 'sub_123' });

            await service.handleWebhookEvent({
                type: 'customer.subscription.updated',
                data: { object: makeStripeSubscription({ cancel_at_period_end: false, cancel_at: 1893456000 }) },
            });

            expect(subscriptionRepository.updateByStripeSubscriptionId).toHaveBeenCalledWith(
                'sub_123', expect.objectContaining({ cancelAtPeriodEnd: true })
            );
        });

        describe('audit trail of the subscription funnel', () => {
            const updateWith = async (existing, stripeOverrides) => {
                subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({
                    userId: 'user-1', stripeSubscriptionId: 'sub_123', status: 'active', cancelAtPeriodEnd: false, ...existing,
                });
                await service.handleWebhookEvent({
                    type: 'customer.subscription.updated',
                    data: { object: makeStripeSubscription(stripeOverrides) },
                });
            };
            const loggedActions = () => auditLogService.log.mock.calls.map(([entry]) => entry.action);

            it('records a trial canceled by the user, telling it apart from a paid subscription', async () => {
                await updateWith({ status: 'trialing' }, { status: 'trialing', cancel_at_period_end: true });

                expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
                    action: 'subscription_cancellation_scheduled',
                    targetUserId: 'user-1',
                    metadata: { stripeSubscriptionId: 'sub_123', status: 'trialing' },
                }));
            });

            it('records a cancellation scheduled from the portal, where cancel_at_period_end stays false', async () => {
                await updateWith({}, { cancel_at: 1893456000 });

                expect(loggedActions()).toEqual(['subscription_cancellation_scheduled']);
            });

            it('records it once even when Stripe delivers the same event again', async () => {
                await updateWith({ cancelAtPeriodEnd: true }, { cancel_at_period_end: true });

                expect(loggedActions()).toEqual([]);
            });

            it('records a trial that turned into a paid subscription', async () => {
                await updateWith({ status: 'trialing' }, { status: 'active' });

                expect(loggedActions()).toEqual(['subscription_trial_converted']);
            });

            it('records a payment that failed, once', async () => {
                await updateWith({ status: 'active' }, { status: 'past_due' });
                expect(loggedActions()).toEqual(['subscription_payment_failed']);

                auditLogService.log.mockClear();
                await updateWith({ status: 'past_due' }, { status: 'past_due' });
                expect(loggedActions()).toEqual([]);
            });

            // Regression: only the first transition of an event was logged, and the
            // row was already updated, so a redelivery could not recover the rest.
            it('records every transition one event carries, not only the first', async () => {
                await updateWith({ status: 'trialing' }, { status: 'active', cancel_at_period_end: true });

                expect(loggedActions()).toEqual(['subscription_cancellation_scheduled', 'subscription_trial_converted']);
            });

            it('records a cancellation that was taken back from the portal', async () => {
                await updateWith({ cancelAtPeriodEnd: true }, { cancel_at_period_end: false });

                expect(loggedActions()).toEqual(['subscription_resumed']);
            });

            // Regression: the row was updated first, so when the lookup of the user
            // failed, Stripe's retry saw no change and the event was lost for good.
            it('leaves the row untouched when the user cannot be read, so the retry finds the same change', async () => {
                subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({
                    userId: 'user-1', stripeSubscriptionId: 'sub_123', status: 'active', cancelAtPeriodEnd: false,
                });
                userRepository.getUserById.mockRejectedValue(new Error('db down'));

                await expect(service.handleWebhookEvent({
                    type: 'customer.subscription.updated',
                    data: { object: makeStripeSubscription({ status: 'past_due' }) },
                })).rejects.toThrow('db down');

                expect(subscriptionRepository.updateByStripeSubscriptionId).not.toHaveBeenCalled();
            });

            it('records nothing for a plain renewal', async () => {
                await updateWith({ status: 'active' }, { status: 'active' });

                expect(loggedActions()).toEqual([]);
            });
        });
    });

    describe('handleWebhookEvent() / customer.subscription.deleted', () => {
        it('marks the subscription canceled and revokes premium immediately', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({
                userId: 'user-1', stripeSubscriptionId: 'sub_123', currentPeriodEnd: new Date('2030-01-01'),
            });
            userRepository.getUserById.mockResolvedValue(makeUser());

            await service.handleWebhookEvent({
                type: 'customer.subscription.deleted',
                data: { object: makeStripeSubscription() },
            });

            expect(subscriptionRepository.updateByStripeSubscriptionId).toHaveBeenCalledWith(
                'sub_123', expect.objectContaining({ status: 'canceled', cancelAtPeriodEnd: true })
            );
            expect(userRepository.updatePremiumUntil).toHaveBeenCalledWith('user-1', expect.any(Date));
            expect(auditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'subscription_canceled', targetUserId: 'user-1' })
            );
        });

        // The signal for a trial that ended without a card: the funnel needs it
        // apart from someone who paid and then canceled.
        it('records what state the subscription was in when it ended', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({
                userId: 'user-1', stripeSubscriptionId: 'sub_123', status: 'trialing', currentPeriodEnd: new Date('2030-01-01'),
            });

            await service.handleWebhookEvent({
                type: 'customer.subscription.deleted',
                data: { object: makeStripeSubscription() },
            });

            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'subscription_canceled',
                metadata: { stripeSubscriptionId: 'sub_123', previousStatus: 'trialing' },
            }));
        });

        // Regression: a redelivered event logged a second "ended", now with
        // previousStatus "canceled", losing the trial-expired distinction.
        it('does nothing when the deletion was already processed', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({
                userId: 'user-1', stripeSubscriptionId: 'sub_123', status: 'canceled', currentPeriodEnd: new Date('2030-01-01'),
            });

            await service.handleWebhookEvent({
                type: 'customer.subscription.deleted',
                data: { object: makeStripeSubscription() },
            });

            expect(subscriptionRepository.updateByStripeSubscriptionId).not.toHaveBeenCalled();
            expect(auditLogService.log).not.toHaveBeenCalled();
        });

        // Regression: premiumUntil was never moved backward, so a subscription
        // canceled with weeks left (a refund, an immediate cancel) kept its Premium.
        it('revokes the Premium this subscription extended when it is canceled before the period ends', async () => {
            const periodEnd = new Date('2030-01-01T00:00:00.000Z');
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({
                userId: 'user-1', stripeSubscriptionId: 'sub_123', status: 'active', currentPeriodEnd: periodEnd,
            });
            userRepository.getUserById.mockResolvedValue(makeUser({ premiumUntil: periodEnd }));

            await service.handleWebhookEvent({ type: 'customer.subscription.deleted', data: { object: makeStripeSubscription() } });

            const [, revokedUntil] = userRepository.updatePremiumUntil.mock.calls[0];
            expect(revokedUntil.getTime()).toBeLessThanOrEqual(Date.now());
        });

        it('does not revoke a premiumUntil an admin granted independently of this subscription', async () => {
            const farFuture = new Date('2099-01-01');
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({
                userId: 'user-1', stripeSubscriptionId: 'sub_123', currentPeriodEnd: new Date('2030-01-01'),
            });
            userRepository.getUserById.mockResolvedValue(makeUser({ premiumUntil: farFuture }));

            await service.handleWebhookEvent({
                type: 'customer.subscription.deleted',
                data: { object: makeStripeSubscription() },
            });

            expect(userRepository.updatePremiumUntil).not.toHaveBeenCalled();
        });
    });

    describe('sendTrialEndingReminders()', () => {
        const NOW = new Date('2026-10-01T10:00:00Z');
        const trial = (overrides = {}) => makeSubscriptionRow({
            id: 'trial-1', status: 'trialing', currentPeriodEnd: new Date('2026-10-03T08:00:00Z'), ...overrides,
        });

        it('looks for the trials that end within the next two days', async () => {
            await service.sendTrialEndingReminders(NOW);

            expect(subscriptionRepository.findTrialsEndingBefore).toHaveBeenCalledWith(new Date('2026-10-03T10:00:00Z'));
        });

        it('tells whoever is in the trial when it ends, in their language, without mentioning a charge if there is no card', async () => {
            subscriptionRepository.findTrialsEndingBefore.mockResolvedValue([trial()]);
            userRepository.getUserById.mockResolvedValue(makeUser({ language: 'es' }));

            const result = await service.sendTrialEndingReminders(NOW);

            expect(emailService.sendTrialEnding).toHaveBeenCalledWith({
                username: 'miriam',
                email: 'miriam@example.com',
                endsAt: new Date('2026-10-03T08:00:00Z'),
                hasPaymentMethod: false,
                language: 'es',
            });
            expect(result).toEqual({ sent: 1 });
        });

        it('warns that the card will be charged when a payment method was added during the trial', async () => {
            subscriptionRepository.findTrialsEndingBefore.mockResolvedValue([trial()]);
            stripeClient.subscriptions.retrieve.mockResolvedValue(makeStripeSubscription({ status: 'trialing', default_payment_method: 'pm_1' }));

            await service.sendTrialEndingReminders(NOW);

            expect(emailService.sendTrialEnding.mock.calls[0][0].hasPaymentMethod).toBe(true);
        });

        it('does not send it twice when another run already took that trial', async () => {
            subscriptionRepository.findTrialsEndingBefore.mockResolvedValue([trial()]);
            subscriptionRepository.claimTrialReminder.mockResolvedValue(false);

            const result = await service.sendTrialEndingReminders(NOW);

            expect(emailService.sendTrialEnding).not.toHaveBeenCalled();
            expect(result).toEqual({ sent: 0 });
        });

        it('gives the trial back for the next run when the email fails, and carries on with the others', async () => {
            subscriptionRepository.findTrialsEndingBefore.mockResolvedValue([trial({ id: 'trial-1' }), trial({ id: 'trial-2' })]);
            emailService.sendTrialEnding.mockRejectedValueOnce(new Error('brevo down'));

            const result = await service.sendTrialEndingReminders(NOW);

            expect(subscriptionRepository.releaseTrialReminder).toHaveBeenCalledWith('trial-1');
            expect(subscriptionRepository.releaseTrialReminder).not.toHaveBeenCalledWith('trial-2');
            expect(emailService.sendTrialEnding).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ sent: 1 });
        });

        it('sends nothing for an account that no longer exists', async () => {
            subscriptionRepository.findTrialsEndingBefore.mockResolvedValue([trial()]);
            userRepository.getUserById.mockResolvedValue(null);

            await service.sendTrialEndingReminders(NOW);

            expect(emailService.sendTrialEnding).not.toHaveBeenCalled();
        });
    });

    describe('handleWebhookEvent() / customer.subscription.deleted / trial email', () => {
        const deleted = () => ({ type: 'customer.subscription.deleted', data: { object: makeStripeSubscription({ status: 'canceled' }) } });

        it('tells the traveller the trial is over when it ended without becoming a paid subscription', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue(makeSubscriptionRow({ status: 'trialing' }));
            userRepository.getUserById.mockResolvedValue(makeUser({ language: 'fr' }));

            await service.handleWebhookEvent(deleted());

            expect(emailService.sendTrialEnded).toHaveBeenCalledWith({ username: 'miriam', email: 'miriam@example.com', language: 'fr' });
        });

        it('does not send it to someone who canceled a paid subscription', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue(makeSubscriptionRow({ status: 'active' }));

            await service.handleWebhookEvent(deleted());

            expect(emailService.sendTrialEnded).not.toHaveBeenCalled();
        });

        it('does not send it again when Stripe redelivers the event', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue(makeSubscriptionRow({ status: 'canceled' }));

            await service.handleWebhookEvent(deleted());

            expect(emailService.sendTrialEnded).not.toHaveBeenCalled();
        });

        it('still processes the cancellation when the email cannot be sent', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue(makeSubscriptionRow({ status: 'trialing' }));
            emailService.sendTrialEnded.mockRejectedValue(new Error('brevo down'));

            await expect(service.handleWebhookEvent(deleted())).resolves.not.toThrow();
            expect(subscriptionRepository.updateByStripeSubscriptionId).toHaveBeenCalled();
        });
    });
});
