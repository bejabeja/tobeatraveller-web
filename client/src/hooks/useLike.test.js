import { act, renderHook } from "@testing-library/react";

const mockNavigate = jest.fn();
let mockPath = { pathname: "/itinerary/abc", search: "?from=home" };

jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate, useLocation: () => mockPath }));
jest.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock("../store/auth/authSelectors", () => ({ selectIsAuthenticated: () => false }));
jest.mock("../services/likes", () => ({ checkIsLiked: jest.fn(), toggleLike: jest.fn() }));
jest.mock("../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../utils/analyticsEvents", () => ({ ANALYTICS_EVENTS: { TRIP_LIKED: "trip_liked" } }));

import { toggleLike } from "../services/likes";
import { useLike } from "./useLike";

describe("useLike for a visitor", () => {
  it("sends them to sign in and brings them back to the page they were on", async () => {
    const { result } = renderHook(() => useLike("abc", 3));

    await act(async () => { await result.current.handleToggleLike({ preventDefault: jest.fn(), stopPropagation: jest.fn() }); });

    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: { redirectTo: "/itinerary/abc?from=home" } });
    expect(toggleLike).not.toHaveBeenCalled();
  });
});
