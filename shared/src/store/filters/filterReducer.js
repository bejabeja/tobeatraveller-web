const initialState = {
    category: "all",
    destination: "",
};

export const filterReducer = (state = initialState, action) => {
    switch (action.type) {
        case "@filters/category":
            return { ...state, category: action.payload };
        case "@filters/destination":
            return { ...state, destination: action.payload };
        case "@filters/reset":
            return initialState;
        default:
            return state;
    }
};
