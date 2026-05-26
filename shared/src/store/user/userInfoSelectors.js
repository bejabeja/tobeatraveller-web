export const selectMyInfoState = (state) => state.myInfo;

export const selectMe = (state) => state.myInfo.me.data;
export const selectMeLoading = (state) => state.myInfo.me.loading;
export const selectMeError = (state) => state.myInfo.me.error;

export const selectMyItineraries = (state) => state.myInfo.myItineraries.data;
export const selectMyItinerariesLoading = (state) => state.myInfo.myItineraries.loading;
export const selectMyItinerariesError = (state) => state.myInfo.myItineraries.error;

export const selectMyFollowing = (state) => state.myInfo.myFollowing.data;
export const selectMyFollowingLoading = (state) => state.myInfo.myFollowing.loading;
export const selectMyFollowingError = (state) => state.myInfo.myFollowing.error;

export const selectMyFollowers = (state) => state.myInfo.myFollowers.data;
export const selectMyFollowersLoading = (state) => state.myInfo.myFollowers.loading;
export const selectMyFollowersError = (state) => state.myInfo.myFollowers.error;
