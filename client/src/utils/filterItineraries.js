export const filterItineraries = (itineraries, filters) => {
    if (!itineraries || !Array.isArray(itineraries)) return [];

    return itineraries.filter((itinerary) => {
        if (
            filters.category &&
            itinerary.category.toLowerCase() !== filters.category.toLowerCase()
        ) return false;

        const budget = parseFloat(itinerary.budget || "0");
        const budgetMin = parseFloat(filters.budgetMin);
        const budgetMax = parseFloat(filters.budgetMax);
        if (!isNaN(budgetMin) && budget < budgetMin) return false;
        if (!isNaN(budgetMax) && budget > budgetMax) return false;

        if (
            filters.destination &&
            !itinerary.location?.name?.toLowerCase().includes(filters.destination.toLowerCase())
        ) return false;

        const duration = parseInt(itinerary.tripTotalDays, 10);
        const durationMin = parseInt(filters.durationMin, 10);
        const durationMax = parseInt(filters.durationMax, 10);
        if (!isNaN(durationMin) && duration < durationMin) return false;
        if (!isNaN(durationMax) && duration > durationMax) return false;

        const start = new Date(itinerary.startDate);
        const startDateMin = filters.startDateMin ? new Date(filters.startDateMin) : null;
        const startDateMax = filters.startDateMax ? new Date(filters.startDateMax) : null;
        if (startDateMin && start < startDateMin) return false;
        if (startDateMax && start > startDateMax) return false;

        return true;
    });
};
