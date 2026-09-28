export const filterItineraries = (itineraries, filters) => {
    if (!itineraries || !Array.isArray(itineraries)) return [];

    return itineraries.filter((itinerary) => {
        if (
            filters.category &&
            itinerary.category?.toLowerCase() !== filters.category.toLowerCase()
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

        // A single merged search box (web's Filters.jsx) sends this instead of
        // destination alone, matching destination/title/description with OR
        // semantics (unlike `destination` above, which is its own AND'd condition).
        if (filters.query) {
            const q = filters.query.toLowerCase();
            const matchesDestination = itinerary.location?.name?.toLowerCase().includes(q);
            const matchesTitle = itinerary.title?.toLowerCase().includes(q);
            const matchesDescription = itinerary.description?.toLowerCase().includes(q);
            if (!matchesDestination && !matchesTitle && !matchesDescription) return false;
        }

        const duration = parseInt(itinerary.tripTotalDays, 10);
        const durationMin = parseInt(filters.durationMin, 10);
        const durationMax = parseInt(filters.durationMax, 10);
        if (!isNaN(durationMin) && duration < durationMin) return false;
        if (!isNaN(durationMax) && duration > durationMax) return false;

        const start = new Date(itinerary.startDate);
        const startDateMin = filters.startDateMin ? new Date(filters.startDateMin) : null;
        const startDateMax = filters.startDateMax ? new Date(filters.startDateMax) : null;
        // A trip without a date can't be said to start in the range asked for.
        if ((startDateMin || startDateMax) && !itinerary.startDate) return false;
        if (startDateMin && start < startDateMin) return false;
        if (startDateMax && start > startDateMax) return false;

        if (filters.currency && itinerary.currency !== filters.currency) return false;

        if (filters.travelersCount) {
            const people = itinerary.numberOfPeople ?? 1;
            if (filters.travelersCount === 'solo'   && people !== 1)                return false;
            if (filters.travelersCount === 'couple' && people !== 2)                return false;
            if (filters.travelersCount === 'group'  && (people < 3 || people > 5)) return false;
            if (filters.travelersCount === 'large'  && people < 6)                 return false;
        }

        if (filters.visibility === 'public'  && !itinerary.isPublic)  return false;
        if (filters.visibility === 'private' &&  itinerary.isPublic)  return false;

        return true;
    });
};
