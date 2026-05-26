export const selectStats = (state) => state.itineraries.stats;
export const selectFeaturedItineraries = (state) => state.itineraries.featuredItineraries.data;
export const selectFeaturedItinerariesLoading = (state) => state.itineraries.featuredItineraries.loading;
export const selectFeaturedItinerariesError = (state) => state.itineraries.featuredItineraries.error;

export const selectExploreItineraries = (state) => state.itineraries.exploreItineraries.data;
export const selectExploreItinerariesLoading = (state) => state.itineraries.exploreItineraries.loading;
export const selectExploreItinerariesLoadingMore = (state) => state.itineraries.exploreItineraries.loadingMore;
export const selectExploreItinerariesError = (state) => state.itineraries.exploreItineraries.error;

export const selectExplorePage = (state) => state.itineraries.exploreItineraries.page;
export const selectExploreTotalPages = (state) => state.itineraries.exploreItineraries.totalPages;
export const selectExploreTotalItems = (state) => state.itineraries.exploreItineraries.totalItems;
