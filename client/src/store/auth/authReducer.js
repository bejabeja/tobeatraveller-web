const getHint = () => {
    try {
        const h = localStorage.getItem('user_hint');
        return h ? JSON.parse(h) : null;
    } catch { return null; }
};

const hint = getHint();

const initialState = {
    user: hint,
    isAuthenticated: !!hint,
    // Whether private pages can decide yet. With the hint of a previous
    // sign-in they trust it straight away (and move to log in if the session
    // turns out to be gone); without it they wait for the session check
    // instead of sending a signed-in user to log in.
    isAuthChecked: !!hint,
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
          isAuthChecked: true,
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
          isAuthChecked: true,
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
  