import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FREE_PLAN_LIMITS, PLAN_COMPARISON } from '../../utils/constants/premiumFeatures.js';

// The pricing page promises these limits; the API is what enforces them.
const apiLimit = (service) => {
    const source = readFileSync(new URL(`../../../../api/src/services/${service}`, import.meta.url), 'utf8');
    return Number(source.match(/const FREE_(?:ENTRY|ITEM)_LIMIT = (\d+);/)[1]);
};

describe('FREE_PLAN_LIMITS', () => {
    it('promises the same free limits the API enforces', () => {
        expect(FREE_PLAN_LIMITS).toEqual({
            vanLog: apiLimit('vanLogService.js'),
            supplies: apiLimit('suppliesService.js'),
            lifeDiary: apiLimit('lifeDiaryService.js'),
        });
    });
});

describe('PLAN_COMPARISON', () => {
    // Neither plan shows ads yet, so it can't be sold as a Premium difference.
    it('compares only what actually differs or is included', () => {
        expect(PLAN_COMPARISON.map(row => row.id)).not.toContain('noAds');
    });

    it('shows the free limit for the tools free accounts can use a little', () => {
        const byId = Object.fromEntries(PLAN_COMPARISON.map(row => [row.id, row.free]));

        expect(byId).toMatchObject({ vanLog: 10, supplies: 10, lifeDiary: 10, packingChecklist: false, aiItineraries: false, core: true });
    });
});
