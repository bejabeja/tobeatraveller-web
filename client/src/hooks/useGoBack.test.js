import { act, renderHook } from "@testing-library/react";

const mockNavigate = jest.fn();
let mockLocation = { key: "abc123" };

jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate, useLocation: () => mockLocation }));

import { useGoBack } from "./useGoBack";

describe("useGoBack", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("goes back one page when the visit has pages of ours behind it", () => {
    mockLocation = { key: "abc123" };
    const { result } = renderHook(() => useGoBack("/explore"));

    act(() => result.current());

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("goes to the fallback instead of leaving the site when the visit began on this page", () => {
    mockLocation = { key: "default" };
    const { result } = renderHook(() => useGoBack("/explore"));

    act(() => result.current());

    expect(mockNavigate).toHaveBeenCalledWith("/explore", { replace: true });
  });
});
