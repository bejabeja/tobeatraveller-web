import { renderHook, waitFor } from "@testing-library/react";
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
