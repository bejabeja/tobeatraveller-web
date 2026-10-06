import { describe, expect, it } from 'vitest';
import { reportDetailsError } from '../../utils/contentReports.js';

describe('reportDetailsError', () => {
    it('lets most reasons go without any words', () => {
        expect(reportDetailsError({ reason: 'spam' })).toBeNull();
        expect(reportDetailsError({ reason: 'harassment', details: '' })).toBeNull();
    });

    it('asks to explain why it is illegal', () => {
        expect(reportDetailsError({ reason: 'illegal', details: '  short ' })).toBe('validation.reportIllegalNeedsDetails');
        expect(reportDetailsError({ reason: 'illegal', details: 'It sells counterfeit goods' })).toBeNull();
    });

    it('refuses a text that is too long', () => {
        expect(reportDetailsError({ reason: 'other', details: 'x'.repeat(1001) })).toBe('validation.tooLong');
    });
});
