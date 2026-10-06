import { renderHook, act } from "@testing-library/react";

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch }));
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../store/auth/authActions.js", () => ({ logoutUser: () => "logout-thunk" }));

import { useLogout } from "./useLogout";

describe("useLogout", () => {
  beforeEach(() => jest.clearAllMocks());

  // Regression: signing out used to go through a "Log out?" window on a page of its own.
  it("signs out and goes to the front page in one go, without asking", async () => {
    mockDispatch.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLogout());

    await act(() => result.current());

    expect(mockDispatch).toHaveBeenCalledWith("logout-thunk");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("goes to the front page only after the session is closed", async () => {
    const order = [];
    mockDispatch.mockImplementation(async () => { order.push("closed"); });
    mockNavigate.mockImplementation(() => order.push("navigated"));
    const { result } = renderHook(() => useLogout());

    await act(() => result.current());

    expect(order).toEqual(["closed", "navigated"]);
  });
});
