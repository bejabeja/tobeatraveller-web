import { getItinerariesByFilters, getfeaturedItineraries, getStats } from "../../services/itineraries.js";

export const START_LOADING_FEATURED_ITINERARIES = "@featuredItineraries/init/start";
export const SET_FEATURED_ITINERARIES = "@featuredItineraries/init/success";
export const SET_FEATURED_ITINERARIES_ERROR = "@featuredItineraries/init/fail";
export const START_LOADING_EXPLORE_ITINERARIES = "@exploreItineraries/startLoading";
export const SET_EXPLORE_ITINERARIES = "@exploreItineraries/setItineraries";
export const SET_EXPLORE_ITINERARIES_ERROR = "@exploreItineraries/setError";
export const SET_EXPLORE_PAGINATION = "@exploreItineraries/setPagination";
export const START_LOADING_MORE_ITINERARIES = "@exploreItineraries/startLoadingMore";
export const SET_STATS = "@stats/set";
export const UPDATE_COMMENTS_COUNT = "@itinerary/updateCommentsCount";

export const updateCommentsCount = (id, count) => ({
    type: UPDATE_COMMENTS_COUNT,
    payload: { id, count },
});

export const initFeaturedItineraries = () => {
    return async (dispatch) => {
        dispatch({ type: START_LOADING_FEATURED_ITINERARIES });

        try {
            const featuredItineraries = await getfeaturedItineraries();

            dispatch({
                type: SET_FEATURED_ITINERARIES,
                payload: featuredItineraries,
            });
        } catch (error) {
            dispatch({ type: SET_FEATURED_ITINERARIES_ERROR });
        }
    };
};


export const initExploreItineraries = (filters) => async (dispatch) => {
    dispatch({ type: START_LOADING_EXPLORE_ITINERARIES });
    try {
        const response = await getItinerariesByFilters(filters);
        const { itineraries, totalPages, totalItems, page } = response;

        dispatch({
            type: SET_EXPLORE_ITINERARIES,
            payload: { itineraries, totalPages, totalItems, page }
        });
    } catch (error) {
        dispatch({
            type: SET_EXPLORE_ITINERARIES_ERROR,
            payload: 'Error fetching explore itineraries'
        });
    }
};


export const loadMoreExploreItineraries = (filters) => async (dispatch) => {
    dispatch({ type: START_LOADING_MORE_ITINERARIES });

    try {
        const response = await getItinerariesByFilters(filters);
        const { itineraries, totalPages, totalItems } = response;

        dispatch({
            type: SET_EXPLORE_ITINERARIES,
            payload: { itineraries, totalPages, totalItems, page: filters.page },
        });
    } catch (error) {
        dispatch({
            type: SET_EXPLORE_ITINERARIES_ERROR,
            payload: 'Error fetching explore itineraries',
        });
    }
};

export const initStats = () => async (dispatch) => {
    try {
        const stats = await getStats();
        dispatch({ type: SET_STATS, payload: stats });
    } catch (error) {
        // stats are non-critical, fail silently
    }
};

export const setExplorePagination = (page) => (dispatch) => {
    dispatch({
        type: SET_EXPLORE_PAGINATION,
        payload: { page }
    });
};
