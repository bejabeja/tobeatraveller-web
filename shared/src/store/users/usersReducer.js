
const initialState = {
    all: {
        data: [],
        loading: true,
        error: null,
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        loadingMore: true,
    },
    featured: {
        data: [],
        loading: true,
        error: null,
    },
};


export const usersReducer = (state = initialState, action) => {
    switch (action.type) {
        case "@users/all/start":
            return {
                ...state,
                all: { ...state.all, loading: true, error: null, currentPage: 1 },
            };

        case "@users/all/success":
            return {
                ...state,
                all: {
                    data: action.payload.users,
                    loading: false,
                    error: null,
                    currentPage: action.payload.currentPage,
                    totalPages: action.payload.totalPages,
                    totalCount: action.payload.totalCount ?? state.all.totalCount,
                },
            };

        case "@users/all/fail":
            return {
                ...state,
                all: { ...state.all, loading: false, error: action.payload },
            };

        case "@users/all/loadMoreStart":
            return {
                ...state,
                all: {
                    ...state.all,
                    loadingMore: true,
                },
            };

        case "@users/all/loadMoreSuccess":
            return {
                ...state,
                all: {
                    ...state.all,
                    data: [...state.all.data, ...action.payload.users],
                    currentPage: action.payload.currentPage,
                    totalPages: action.payload.totalPages,
                    loadingMore: false,
                },
            };

        case "@users/all/loadMoreFail":
            return {
                ...state,
                all: {
                    ...state.all,
                    loadingMore: false,
                },
            };

        case "@users/featured/start":
            return {
                ...state,
                featured: { ...state.featured, loading: true, error: null },
            };

        case "@users/featured/success":
            return {
                ...state,
                featured: { data: action.payload, loading: false, error: null },
            };

        case "@users/featured/fail":
            return {
                ...state,
                featured: { ...state.featured, loading: false, error: action.payload },
            };

        default:
            return state;
    }
};
