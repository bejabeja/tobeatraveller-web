import { describe, expect, it, vi } from 'vitest';
import { PackingRemindersService } from '../../services/packingRemindersService.js';

describe('PackingRemindersService.sendTripReminders()', () => {
    it('looks for the trips starting in two days', async () => {
        const lists = { findTripsToRemind: vi.fn().mockResolvedValue([]) };
        const service = new PackingRemindersService(lists, { createNotification: vi.fn() });

        await service.sendTripReminders(new Date('2026-09-28T08:00:00Z'));

        expect(lists.findTripsToRemind).toHaveBeenCalledWith('2026-09-30');
    });

    it('reminds each trip\'s owner of how much is left to pack', async () => {
        const lists = { findTripsToRemind: vi.fn().mockResolvedValue([{ userId: 'u1', itineraryId: 't1', remainingCount: 8 }]) };
        const notifications = { createNotification: vi.fn().mockResolvedValue() };
        const service = new PackingRemindersService(lists, notifications);

        const result = await service.sendTripReminders(new Date('2026-09-28T08:00:00Z'));

        expect(notifications.createNotification).toHaveBeenCalledWith({
            userId: 'u1', actorId: 'u1', type: 'trip_packing', itineraryId: 't1', remainingCount: 8,
        });
        expect(result).toEqual({ reminded: 1 });
    });

    it('keeps reminding the others when one fails', async () => {
        const lists = { findTripsToRemind: vi.fn().mockResolvedValue([
            { userId: 'u1', itineraryId: 't1', remainingCount: 1 },
            { userId: 'u2', itineraryId: 't2', remainingCount: 3 },
        ]) };
        const notifications = { createNotification: vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue() };
        const service = new PackingRemindersService(lists, notifications);

        await service.sendTripReminders(new Date('2026-09-28T08:00:00Z'));

        expect(notifications.createNotification).toHaveBeenCalledTimes(2);
    });
});
