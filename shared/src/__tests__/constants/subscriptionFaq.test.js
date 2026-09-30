import { describe, expect, it } from 'vitest';
import en from '../../locales/en.json';
import { SUBSCRIPTION_FAQ } from '../../utils/constants/subscriptionFaq.js';

const textOf = (key) => key.split('.').reduce((node, part) => node?.[part], en);

describe('SUBSCRIPTION_FAQ', () => {
    it('answers what stops people from subscribing: the trial, canceling, their data, ads and invoices', () => {
        expect(SUBSCRIPTION_FAQ.map(entry => entry.id)).toEqual(['trial', 'cancel', 'data', 'ads', 'invoices']);
    });

    it('has a question and an answer written for each entry', () => {
        SUBSCRIPTION_FAQ.forEach(({ questionKey, answerKey }) => {
            expect(textOf(questionKey)).toBeTruthy();
            expect(textOf(answerKey)).toBeTruthy();
        });
    });
});
