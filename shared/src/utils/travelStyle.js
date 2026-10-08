export const TRAVEL_STYLES = Object.freeze({ VAN: 'van', OCCASIONAL: 'occasional' });

// What a new person is offered to start with, by how they travel. Each name is
// matched by every app to its own screen. Whoever did not say gets the general ones.
const START_STEPS = Object.freeze({
    [TRAVEL_STYLES.VAN]: ['startExpense', 'startSupplies', 'startChecklist'],
    [TRAVEL_STYLES.OCCASIONAL]: ['startTrip', 'startPackingList', 'startPassport'],
});

export const startStepsFor = (travelStyle) => START_STEPS[travelStyle] ?? START_STEPS[TRAVEL_STYLES.OCCASIONAL];
