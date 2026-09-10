import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionService } from '../../services/subscriptionService.js';

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
    let service;

    beforeEach(() => {
        subscriptionRepository = {
            create: vi.fn(async (data) => ({ id: 'local-sub-1', ...data })),
            findByStripeSubscriptionId: vi.fn(async () => null),
            updateByStripeSubscriptionId: vi.fn(async (stripeSubscriptionId, data) => makeSubscriptionRow({ stripeSubscriptionId, ...data })),
            findByUserId: vi.fn(async () => []),
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
            },
            webhooks: { constructEvent: vi.fn() },
        };
        service = new SubscriptionService(subscriptionRepository, userRepository, auditLogService, stripeClient);
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

        it('allows checking out again when the previous subscription was canceled', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([makeSubscriptionRow({ status: 'canceled' })]);

            const { url } = await service.createCheckoutSession('user-1', 'monthly');

            expect(url).toBe('https://checkout.stripe.com/session-1');
        });

        it('grants a 7-day free trial on a user\'s first subscription', async () => {
            await service.createCheckoutSession('user-1', 'monthly');

            expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
                expect.objectContaining({ subscription_data: { trial_period_days: 7 } })
            );
        });

        it('does not grant a trial when the user has subscribed before', async () => {
            subscriptionRepository.findByUserId.mockResolvedValue([{ id: 'past-sub' }]);

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

        it('does not touch premium when the subscription is past_due', async () => {
            subscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({ userId: 'user-1', stripeSubscriptionId: 'sub_123' });

            await service.handleWebhookEvent({
                type: 'customer.subscription.updated',
                data: { object: makeStripeSubscription({ status: 'past_due' }) },
            });

            expect(userRepository.updatePremiumUntil).not.toHaveBeenCalled();
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
});
