export const selectAllUsers = (state) => state.users.all.data;
export const selectAllUsersLoading = (state) => state.users.all.loading;
export const selectAllUsersError = (state) => state.users.all.error;

export const selectAllUsersCurrentPage = (state) => state.users.all.currentPage;
export const selectAllUsersTotalPages = (state) => state.users.all.totalPages;
export const selectAllUsersLoadingMore = (state) => state.users.all.loadingMore;
export const selectAllUsersTotalCount = (state) => state.users.all.totalCount;

export const selectFeaturedUsers = (state) => state.users.featured.data;
export const selectFeaturedUsersLoading = (state) =>
    state.users.featured.loading;
export const selectFeaturedUsersError = (state) => state.users.featured.error;

