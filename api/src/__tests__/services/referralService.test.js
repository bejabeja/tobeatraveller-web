import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferralService } from '../../services/referralService.js';

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'jane',
  email: 'jane@example.com',
  referralCode: null,
  premiumUntil: null,
  isPremium() { return !!this.premiumUntil && new Date(this.premiumUntil) > new Date(); },
  ...overrides,
});

describe('ReferralService', () => {
  let referralRepository;
  let userRepository;
  let service;

  beforeEach(() => {
    referralRepository = {
      createPending: vi.fn().mockResolvedValue(undefined),
      findPendingByReferredUserId: vi.fn(),
      markRewarded: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn(),
      getInvitesByReferrerId: vi.fn(),
      getPlatformStats: vi.fn(),
      getTopReferrers: vi.fn(),
    };
    userRepository = {
      getUserById: vi.fn(),
      findByReferralCode: vi.fn(),
      setReferralCodeIfUnset: vi.fn(),
      updatePremiumUntil: vi.fn().mockResolvedValue(undefined),
    };
    service = new ReferralService(referralRepository, userRepository);
  });

  describe('codeFromUsername()', () => {
    it('lowercases the username', () => {
      expect(service.codeFromUsername('JaneDoe')).toBe('janedoe');
    });

    it('trims surrounding whitespace', () => {
      expect(service.codeFromUsername('  jane  ')).toBe('jane');
    });
  });

  describe('getOrCreateReferralCode()', () => {
    it('returns the existing code without writing anything', async () => {
      userRepository.getUserById.mockResolvedValue(makeUser({ referralCode: 'existing-code' }));

      const code = await service.getOrCreateReferralCode('user-1');

      expect(code).toBe('existing-code');
      expect(userRepository.setReferralCodeIfUnset).not.toHaveBeenCalled();
    });

    it('derives a code from the username and persists it when the user has none yet', async () => {
      userRepository.getUserById.mockResolvedValue(makeUser({ username: 'JaneDoe', referralCode: null }));
      userRepository.setReferralCodeIfUnset.mockResolvedValue(makeUser({ referralCode: 'janedoe' }));

      const code = await service.getOrCreateReferralCode('user-1');

      expect(userRepository.setReferralCodeIfUnset).toHaveBeenCalledWith('user-1', 'janedoe');
      expect(code).toBe('janedoe');
    });

    it('re-reads the user when a concurrent request already set the code first', async () => {
      userRepository.getUserById
        .mockResolvedValueOnce(makeUser({ referralCode: null }))
        .mockResolvedValueOnce(makeUser({ referralCode: 'winner-code' }));
      userRepository.setReferralCodeIfUnset.mockResolvedValue(null);

      const code = await service.getOrCreateReferralCode('user-1');

      expect(code).toBe('winner-code');
    });
  });

  describe('getStats()', () => {
    it('delegates to the repository', async () => {
      referralRepository.getStats.mockResolvedValue({ invited: 3, rewarded: 1 });

      const stats = await service.getStats('user-1');

      expect(referralRepository.getStats).toHaveBeenCalledWith('user-1');
      expect(stats).toEqual({ invited: 3, rewarded: 1 });
    });
  });

  describe('getInvites()', () => {
    it('delegates to the repository', async () => {
      const invites = [{ id: 'referral-1', status: 'rewarded', referredUser: { id: 'user-2', username: 'bob' } }];
      referralRepository.getInvitesByReferrerId.mockResolvedValue(invites);

      const result = await service.getInvites('user-1');

      expect(referralRepository.getInvitesByReferrerId).toHaveBeenCalledWith('user-1');
      expect(result).toBe(invites);
    });
  });

  describe('getPlatformOverview()', () => {
    it('combines platform stats, top referrers and the capped-event count', async () => {
      const auditLogService = { log: vi.fn(), getFiltered: vi.fn().mockResolvedValue({ total: 4, entries: [] }) };
      const serviceWithAudit = new ReferralService(referralRepository, userRepository, auditLogService);
      referralRepository.getPlatformStats.mockResolvedValue({ totalReferrals: 20, totalRewarded: 12 });
      const topReferrers = [{ referrer: { id: 'user-2', username: 'bob' }, invited: 5, rewarded: 3 }];
      referralRepository.getTopReferrers.mockResolvedValue(topReferrers);

      const overview = await serviceWithAudit.getPlatformOverview();

      expect(referralRepository.getTopReferrers).toHaveBeenCalledWith(10);
      expect(auditLogService.getFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'referral_reward_capped' })
      );
      expect(overview).toEqual({
        totalReferrals: 20, totalRewarded: 12, topReferrers, cappedCount: 4,
      });
    });

    it('defaults cappedCount to 0 when no audit log service is wired', async () => {
      referralRepository.getPlatformStats.mockResolvedValue({ totalReferrals: 3, totalRewarded: 1 });
      referralRepository.getTopReferrers.mockResolvedValue([]);

      const overview = await service.getPlatformOverview();

      expect(overview.cappedCount).toBe(0);
    });
  });

  describe('registerSignup()', () => {
    it('does nothing when no referral code is given', async () => {
      await service.registerSignup(undefined, 'new-user');

      expect(userRepository.findByReferralCode).not.toHaveBeenCalled();
      expect(referralRepository.createPending).not.toHaveBeenCalled();
    });

    it('does nothing when the referral code matches no user', async () => {
      userRepository.findByReferralCode.mockResolvedValue(null);

      await service.registerSignup('unknown-code', 'new-user');

      expect(referralRepository.createPending).not.toHaveBeenCalled();
    });

    it('does not let a user refer themselves', async () => {
      userRepository.findByReferralCode.mockResolvedValue(makeUser({ id: 'new-user' }));

      await service.registerSignup('own-code', 'new-user');

      expect(referralRepository.createPending).not.toHaveBeenCalled();
    });

    it('creates a pending referral linking the referrer to the new user', async () => {
      userRepository.findByReferralCode.mockResolvedValue(makeUser({ id: 'referrer-1' }));

      await service.registerSignup('referrer-code', 'new-user');

      expect(referralRepository.createPending).toHaveBeenCalledWith('referrer-1', 'new-user');
    });
  });

  describe('rewardFirstItinerary()', () => {
    it('does nothing when there is no pending referral for this user', async () => {
      referralRepository.findPendingByReferredUserId.mockResolvedValue(null);

      await service.rewardFirstItinerary('new-user');

      expect(userRepository.updatePremiumUntil).not.toHaveBeenCalled();
      expect(referralRepository.markRewarded).not.toHaveBeenCalled();
    });

    it('grants 30 days of premium to both the referrer and the referred user, from today', async () => {
      referralRepository.findPendingByReferredUserId.mockResolvedValue({
        id: 'referral-1', referrerId: 'referrer-1', referredUserId: 'new-user',
      });
      userRepository.getUserById.mockImplementation(async (id) => makeUser({ id, premiumUntil: null }));

      await service.rewardFirstItinerary('new-user');

      const [referrerCall, referredCall] = userRepository.updatePremiumUntil.mock.calls;
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      expect(referrerCall[0]).toBe('referrer-1');
      expect(referredCall[0]).toBe('new-user');
      expect(referrerCall[1].getTime()).toBeCloseTo(Date.now() + THIRTY_DAYS_MS, -3);
      expect(referralRepository.markRewarded).toHaveBeenCalledWith('referral-1');
    });

    it('extends an already-active premium instead of overwriting it with a shorter date', async () => {
      const farFuture = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days out
      referralRepository.findPendingByReferredUserId.mockResolvedValue({
        id: 'referral-1', referrerId: 'referrer-1', referredUserId: 'new-user',
      });
      userRepository.getUserById.mockImplementation(async (id) =>
        id === 'referrer-1' ? makeUser({ id, premiumUntil: farFuture }) : makeUser({ id, premiumUntil: null })
      );

      await service.rewardFirstItinerary('new-user');

      const referrerCall = userRepository.updatePremiumUntil.mock.calls.find(call => call[0] === 'referrer-1');
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      expect(referrerCall[1].getTime()).toBeCloseTo(farFuture.getTime() + THIRTY_DAYS_MS, -3);
    });

    it('logs a referral_reward_granted audit event', async () => {
      const auditLogService = { log: vi.fn(), getFiltered: vi.fn().mockResolvedValue({ total: 0, entries: [] }) };
      const serviceWithAudit = new ReferralService(referralRepository, userRepository, auditLogService);
      referralRepository.findPendingByReferredUserId.mockResolvedValue({
        id: 'referral-1', referrerId: 'referrer-1', referredUserId: 'new-user',
      });
      userRepository.getUserById.mockImplementation(async (id) => makeUser({ id, premiumUntil: null }));

      await serviceWithAudit.rewardFirstItinerary('new-user');

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'new-user',
          action: 'referral_reward_granted',
          targetUserId: 'referrer-1',
        })
      );
    });

    describe('monthly referrer cap (via the audit log)', () => {
      let auditLogService;
      let notificationsService;
      let emailService;
      let serviceWithCap;

      beforeEach(() => {
        auditLogService = { log: vi.fn(), getFiltered: vi.fn() };
        notificationsService = { createNotification: vi.fn().mockResolvedValue(undefined) };
        emailService = { sendReferralReward: vi.fn().mockResolvedValue(undefined) };
        serviceWithCap = new ReferralService(referralRepository, userRepository, auditLogService, notificationsService, emailService);
        referralRepository.findPendingByReferredUserId.mockResolvedValue({
          id: 'referral-1', referrerId: 'referrer-1', referredUserId: 'new-user',
        });
        userRepository.getUserById.mockImplementation(async (id) => makeUser({ id, premiumUntil: null }));
      });

      it('still rewards, notifies and marks the referral rewarded when under the monthly limit', async () => {
        auditLogService.getFiltered.mockResolvedValue({ total: 9, entries: [] });

        await serviceWithCap.rewardFirstItinerary('new-user');

        expect(userRepository.updatePremiumUntil).toHaveBeenCalledWith('referrer-1', expect.any(Date));
        expect(referralRepository.markRewarded).toHaveBeenCalledWith('referral-1');
        expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'referral_reward_granted' }));
      });

      it("does not grant the referrer's premium once they've hit the monthly cap", async () => {
        auditLogService.getFiltered.mockResolvedValue({ total: 10, entries: [] });

        await serviceWithCap.rewardFirstItinerary('new-user');

        expect(userRepository.updatePremiumUntil).not.toHaveBeenCalledWith('referrer-1', expect.any(Date));
      });

      it("still grants and marks the referred user's own reward when the referrer is capped", async () => {
        auditLogService.getFiltered.mockResolvedValue({ total: 10, entries: [] });

        await serviceWithCap.rewardFirstItinerary('new-user');

        expect(userRepository.updatePremiumUntil).toHaveBeenCalledWith('new-user', expect.any(Date));
        expect(referralRepository.markRewarded).toHaveBeenCalledWith('referral-1');
      });

      it('logs referral_reward_capped instead of referral_reward_granted once capped', async () => {
        auditLogService.getFiltered.mockResolvedValue({ total: 10, entries: [] });

        await serviceWithCap.rewardFirstItinerary('new-user');

        expect(auditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'referral_reward_capped', targetUserId: 'referrer-1' })
        );
        expect(auditLogService.log).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'referral_reward_granted' }));
      });

      it('still notifies the referred user but not the referrer once capped, and sends no email', async () => {
        auditLogService.getFiltered.mockResolvedValue({ total: 10, entries: [] });

        await serviceWithCap.rewardFirstItinerary('new-user', 'itin-1');

        expect(notificationsService.createNotification).toHaveBeenCalledWith({
          userId: 'new-user', actorId: 'referrer-1', type: 'referral_reward', itineraryId: 'itin-1',
        });
        expect(notificationsService.createNotification).not.toHaveBeenCalledWith(
          expect.objectContaining({ userId: 'referrer-1' })
        );
        expect(emailService.sendReferralReward).not.toHaveBeenCalled();
      });

      it("checks the referrer's reward count since the start of the current month", async () => {
        auditLogService.getFiltered.mockResolvedValue({ total: 0, entries: [] });

        await serviceWithCap.rewardFirstItinerary('new-user');

        const filters = auditLogService.getFiltered.mock.calls[0][0];
        expect(filters.targetUserId).toBe('referrer-1');
        expect(filters.action).toBe('referral_reward_granted');
        expect(new Date(filters.dateFrom).getDate()).toBe(1);
      });
    });

    it('notifies both the referrer and the referred user, linking to the triggering itinerary', async () => {
      const notificationsService = { createNotification: vi.fn().mockResolvedValue(undefined) };
      const serviceWithNotifications = new ReferralService(referralRepository, userRepository, null, notificationsService);
      referralRepository.findPendingByReferredUserId.mockResolvedValue({
        id: 'referral-1', referrerId: 'referrer-1', referredUserId: 'new-user',
      });
      userRepository.getUserById.mockImplementation(async (id) => makeUser({ id, premiumUntil: null }));

      await serviceWithNotifications.rewardFirstItinerary('new-user', 'itin-1');

      expect(notificationsService.createNotification).toHaveBeenCalledWith({
        userId: 'referrer-1', actorId: 'new-user', type: 'referral_reward', itineraryId: 'itin-1',
      });
      expect(notificationsService.createNotification).toHaveBeenCalledWith({
        userId: 'new-user', actorId: 'referrer-1', type: 'referral_reward', itineraryId: 'itin-1',
      });
    });

    it('does not let a failing notification break the reward flow', async () => {
      const notificationsService = { createNotification: vi.fn().mockRejectedValue(new Error('down')) };
      const serviceWithNotifications = new ReferralService(referralRepository, userRepository, null, notificationsService);
      referralRepository.findPendingByReferredUserId.mockResolvedValue({
        id: 'referral-1', referrerId: 'referrer-1', referredUserId: 'new-user',
      });
      userRepository.getUserById.mockImplementation(async (id) => makeUser({ id, premiumUntil: null }));

      await expect(serviceWithNotifications.rewardFirstItinerary('new-user')).resolves.toBeUndefined();
    });

    it('emails only the referrer, using the referred user\'s username', async () => {
      const emailService = { sendReferralReward: vi.fn().mockResolvedValue(undefined) };
      const serviceWithEmail = new ReferralService(referralRepository, userRepository, null, null, emailService);
      referralRepository.findPendingByReferredUserId.mockResolvedValue({
        id: 'referral-1', referrerId: 'referrer-1', referredUserId: 'new-user',
      });
      userRepository.getUserById.mockImplementation(async (id) =>
        id === 'referrer-1'
          ? makeUser({ id, username: 'alice', email: 'alice@example.com', premiumUntil: null })
          : makeUser({ id, username: 'bob', email: 'bob@example.com', premiumUntil: null })
      );

      await serviceWithEmail.rewardFirstItinerary('new-user');

      expect(emailService.sendReferralReward).toHaveBeenCalledWith({
        username: 'alice', email: 'alice@example.com', friendUsername: 'bob',
      });
      expect(emailService.sendReferralReward).toHaveBeenCalledTimes(1);
    });

    it('does not let a failing email break the reward flow', async () => {
      const emailService = { sendReferralReward: vi.fn().mockRejectedValue(new Error('brevo down')) };
      const serviceWithEmail = new ReferralService(referralRepository, userRepository, null, null, emailService);
      referralRepository.findPendingByReferredUserId.mockResolvedValue({
        id: 'referral-1', referrerId: 'referrer-1', referredUserId: 'new-user',
      });
      userRepository.getUserById.mockImplementation(async (id) => makeUser({ id, premiumUntil: null }));

      await expect(serviceWithEmail.rewardFirstItinerary('new-user')).resolves.toBeUndefined();
    });
  });
});
