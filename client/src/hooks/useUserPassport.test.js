import { act, renderHook, waitFor } from "@testing-library/react";
import { useUserPassport } from "./useUserPassport";

jest.mock("../services/passport", () => ({
  getUserPassport: jest.fn(),
}));

import { getUserPassport } from "../services/passport";

const passportOf = (username) => ({ owner: { username }, achievements: [], countries: [] });

describe("useUserPassport", () => {
  it("does not keep showing the previous user's passport while the next one loads", async () => {
    getUserPassport.mockResolvedValueOnce(passportOf("alice"));
    const { result, rerender } = renderHook(({ userId }) => useUserPassport(userId), {
      initialProps: { userId: "user-a" },
    });
    await waitFor(() => expect(result.current.passport?.owner.username).toBe("alice"));

    getUserPassport.mockReturnValueOnce(new Promise(() => {}));
    rerender({ userId: "user-b" });

    expect(result.current.passport).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});

describe("useUserPassport reload", () => {
  it("keeps the passport on screen while reloading the same one", async () => {
    getUserPassport.mockResolvedValueOnce(passportOf("alice"));
    const { result } = renderHook(() => useUserPassport("user-a"));
    await waitFor(() => expect(result.current.passport?.owner.username).toBe("alice"));

    getUserPassport.mockReturnValueOnce(new Promise(() => {}));
    act(() => result.current.reload());

    expect(result.current.passport?.owner.username).toBe("alice");
    expect(result.current.loading).toBe(false);
  });

  it("shows the fresh passport once reloaded", async () => {
    getUserPassport.mockResolvedValueOnce(passportOf("alice"));
    const { result } = renderHook(() => useUserPassport("user-a"));
    await waitFor(() => expect(result.current.passport).not.toBeNull());

    getUserPassport.mockResolvedValueOnce({ ...passportOf("alice"), declaredCountries: [{ code: "JP" }] });
    act(() => result.current.reload());

    await waitFor(() => expect(result.current.passport.declaredCountries).toEqual([{ code: "JP" }]));
  });
});
