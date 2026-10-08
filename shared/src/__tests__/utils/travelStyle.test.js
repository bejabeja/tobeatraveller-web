import { describe, expect, it } from 'vitest';
import { startStepsFor, TRAVEL_STYLES } from '../../utils/travelStyle.js';

describe('startStepsFor', () => {
    it('starts someone in a van with what they do every day on the road', () => {
        expect(startStepsFor(TRAVEL_STYLES.VAN)).toEqual(['startExpense', 'startSupplies', 'startChecklist']);
    });

    it('starts someone who travels now and then with the trip, the packing list and the passport', () => {
        expect(startStepsFor(TRAVEL_STYLES.OCCASIONAL)).toEqual(['startTrip', 'startPackingList', 'startPassport']);
    });

    // Regression-in-waiting: skipping the question, or an answer from a newer app, must not leave nothing to start with.
    it.each([[null], [undefined], [''], ['boat']])('gives the general ones to whoever did not say, or said %s', (style) => {
        expect(startStepsFor(style)).toEqual(startStepsFor(TRAVEL_STYLES.OCCASIONAL));
    });

    it('always offers three', () => {
        Object.values(TRAVEL_STYLES).forEach((style) => expect(startStepsFor(style)).toHaveLength(3));
    });
});
