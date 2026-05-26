const initialState = {
    user: null,
    isAuthenticated: false,
    error: null,
    imageHeroLoaded: false,
    imageAuthLoaded: false,
};
  
  export const authReducer = (state = initialState, action) => {
    switch (action.type) {
      case "@auth/init":
      case "@auth/login":
        return {
          ...state,
          user: action.payload,
          isAuthenticated: !!action.payload,
          error: action.error || null,
        };
  
      case "@auth/create-user":
        return {
          ...state,
          error: action.error || null,
        };
  
      case "@auth/logout":
        return {
          ...state,
          user: null,
          isAuthenticated: false,
        };
  
      case "@auth/clearError":
        return {
          ...state,
          error: null,
        };
  
      case "@auth/setImageHeroLoaded":
        return {
          ...state,
          imageHeroLoaded: true,
        };
  
      case "@auth/setImageAuthLoaded":
        return {
          ...state,
          imageAuthLoaded: true,
        };
  
      default:
        return state;
    }
  };
  