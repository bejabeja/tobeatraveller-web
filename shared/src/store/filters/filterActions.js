export const setCategory = (category) => (dispatch) => {
    dispatch({
        type: "@filters/category",
        payload: category,
    });
};

export const setDestination = (destination) => (dispatch) => {
    dispatch({
        type: "@filters/destination",
        payload: destination,
    });
};

export const resetFilters = () => (dispatch) => {
    dispatch({ type: "@filters/reset" });
};


export const initFilters = () => (dispatch) => {
    const defaultCategory = "all";
    const defaultDestination = "";

    dispatch(setCategory(defaultCategory));
    dispatch(setDestination(defaultDestination));
};