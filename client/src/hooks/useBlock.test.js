import { act, renderHook, waitFor } from "@testing-library/react";

const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch, useSelector: () => ({ id: "me-1" }) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${vars.username}` : key) }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../services/blocks", () => ({ getBlockStatus: jest.fn(), blockUser: jest.fn(), unblockUser: jest.fn() }));
jest.mock("../store/user/userInfoActions", () => ({
  setUserInfo: (id) => ({ type: "setUserInfo", id }),
  setUserInfoFollowing: (id) => ({ type: "setUserInfoFollowing", id }),
}));

import toast from "react-hot-toast";
import { blockUser, getBlockStatus, unblockUser } from "../services/blocks";
import { useBlock } from "./useBlock";

describe("useBlock", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBlockStatus.mockResolvedValue({ blocked: false });
    blockUser.mockResolvedValue(null);
    unblockUser.mockResolvedValue(null);
  });

  it("starts from whether the person is already blocked", async () => {
    getBlockStatus.mockResolvedValue({ blocked: true });

    const { result } = renderHook(() => useBlock("user-2", true, "ana"));

    await waitFor(() => expect(result.current.isBlocked).toBe(true));
  });

  it("does not ask when there is nobody to block, such as on one's own profile", () => {
    renderHook(() => useBlock("user-2", false, "ana"));

    expect(getBlockStatus).not.toHaveBeenCalled();
  });

  // Blocking ends the follow between the two: the followed list must be read again.
  it("blocks, says so, and reads the viewer's followed people again", async () => {
    const { result } = renderHook(() => useBlock("user-2", true, "ana"));
    await waitFor(() => expect(getBlockStatus).toHaveBeenCalled());

    await act(() => result.current.toggleBlock());

    expect(blockUser).toHaveBeenCalledWith("user-2");
    expect(result.current.isBlocked).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("block.blocked:ana");
    expect(mockDispatch).toHaveBeenCalledWith({ type: "setUserInfoFollowing", id: "me-1" });
  });

  it("unblocks a blocked person", async () => {
    getBlockStatus.mockResolvedValue({ blocked: true });
    const { result } = renderHook(() => useBlock("user-2", true, "ana"));
    await waitFor(() => expect(result.current.isBlocked).toBe(true));

    await act(() => result.current.toggleBlock());

    expect(unblockUser).toHaveBeenCalledWith("user-2");
    expect(result.current.isBlocked).toBe(false);
    expect(toast.success).toHaveBeenCalledWith("block.unblocked:ana");
  });

  it("says it could not change the block and leaves it as it was", async () => {
    blockUser.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useBlock("user-2", true, "ana"));
    await waitFor(() => expect(getBlockStatus).toHaveBeenCalled());

    await act(() => result.current.toggleBlock());

    expect(result.current.isBlocked).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("block.error");
  });
});
