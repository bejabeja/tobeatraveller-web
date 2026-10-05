import { act, renderHook } from "@testing-library/react";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/friend-profile/u2", search: "" }),
}));
jest.mock("react-redux", () => ({ useSelector: (selector) => selector(), useDispatch: () => jest.fn() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock("../store/auth/authSelectors", () => ({ selectIsAuthenticated: () => false }));
jest.mock("../store/user/userInfoSelectors", () => ({ selectMe: () => null }));
jest.mock("../store/user/userInfoActions", () => ({ setUserInfo: jest.fn(), setUserInfoFollowing: jest.fn() }));
jest.mock("../services/followers", () => ({ followUser: jest.fn(), unfollowUser: jest.fn() }));
jest.mock("../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../utils/analyticsEvents", () => ({ ANALYTICS_EVENTS: { USER_FOLLOWED: "user_followed" } }));

import { followUser } from "../services/followers";
import { useFollow } from "./useFollow";

describe("useFollow for a visitor", () => {
  it("sends them to sign in and brings them back to the profile they wanted to follow", async () => {
    const { result } = renderHook(() => useFollow("u2"));

    await act(async () => { await result.current.toggleFollow(); });

    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: { redirectTo: "/friend-profile/u2" } });
    expect(followUser).not.toHaveBeenCalled();
  });
});
