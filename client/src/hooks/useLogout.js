import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../store/auth/authActions.js";

// Signing out costs nothing here (nothing waits to be synced, as on the phone),
// so it is one click: logoutUser says it was closed, and this goes to the front page.
export const useLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return useCallback(async () => {
    await dispatch(logoutUser());
    navigate("/");
  }, [dispatch, navigate]);
};
