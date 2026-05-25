import {
    SET_EXPLORE_ITINERARIES,
    SET_EXPLORE_ITINERARIES_ERROR,
    SET_EXPLORE_PAGINATION,
    SET_FEATURED_ITINERARIES,
    SET_FEATURED_ITINERARIES_ERROR,
    SET_STATS,
    START_LOADING_EXPLORE_ITINERARIES,
    START_LOADING_FEATURED_ITINERARIES,
    START_LOADING_MORE_ITINERARIES,
    UPDATE_COMMENTS_COUNT,
} from './itinerariesActions';

const initialState = {
    stats: { trips: 0, travelers: 0, destinations: 0 },
    featuredItineraries: {
        data: [],
        loading: false,
        error: null,
    },
    exploreItineraries: {
        data: [],
        loading: false,
        error: null,
        page: 1,
        totalPages: 1,
        totalItems: 0,
    },
};

export const itinerariesReducer = (state = initialState, action) => {
    switch (action.type) {
        case START_LOADING_FEATURED_ITINERARIES:
            return { ...state, featuredItineraries: { ...state.featuredItineraries, loading: true } };

        case SET_FEATURED_ITINERARIES:
            return {
                ...state,
                featuredItineraries: {
                    data: action.payload,
                    loading: false,
                    error: null,
                }
            };

        case SET_FEATURED_ITINERARIES_ERROR:
            return {
                ...state,
                featuredItineraries: {
                    ...state.featuredItineraries,
                    error: action.payload,
                    loading: false
                }
            };

        case START_LOADING_EXPLORE_ITINERARIES:
            return { ...state, exploreItineraries: { ...state.exploreItineraries, loading: true } };

        case START_LOADING_MORE_ITINERARIES:
            return {
                ...state,
                exploreItineraries: {
                    ...state.exploreItineraries,
                    loadingMore: true,
                },
            };
            
        case SET_EXPLORE_ITINERARIES:
            return {
                ...state,
                exploreItineraries: {
                    ...state.exploreItineraries,
                    data: action.payload.page === 1
                        ? action.payload.itineraries
                        : [...state.exploreItineraries.data, ...action.payload.itineraries],
                    loading: false,
                    loadingMore: false,
                    error: null,
                    page: action.payload.page,
                    totalPages: action.payload.totalPages,
                    totalItems: action.payload.totalItems,
                }
            };

        case SET_EXPLORE_ITINERARIES_ERROR:
            return {
                ...state,
                exploreItineraries: {
                    ...state.exploreItineraries,
                    error: action.payload,
                    loading: false,
                }
            };

        case SET_EXPLORE_PAGINATION:
            return {
                ...state,
                exploreItineraries: {
                    ...state.exploreItineraries,
                    page: action.payload.page,
                }
            };

        case SET_STATS:
            return { ...state, stats: action.payload };

        case UPDATE_COMMENTS_COUNT: {
            const patch = (list) => list.map((it) =>
                it.id === action.payload.id ? { ...it, commentsCount: action.payload.count } : it
            );
            return {
                ...state,
                featuredItineraries: { ...state.featuredItineraries, data: patch(state.featuredItineraries.data) },
                exploreItineraries: { ...state.exploreItineraries, data: patch(state.exploreItineraries.data) },
            };
        }

        default:
            return state;
    }
};
