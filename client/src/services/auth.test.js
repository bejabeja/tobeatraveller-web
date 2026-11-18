jest.mock("@tobeatraveller/shared", () => ({ getApiUrl: () => "http://api.test" }));

import { forgetStoredTokens, login } from "./auth";

// Regression: the web kept both tokens in localStorage, where any script on the page could
// read them and take the session elsewhere. The session is now in cookies it cannot read.
describe("the web session", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "user-1" }, accessToken: "access", refreshToken: "refresh" }),
    });
  });

  it("signs in with the cookies and keeps no token where a script could read it", async () => {
    const user = await login({ email: "jane@example.com", password: "secret" });

    expect(user).toEqual({ id: "user-1" });
    expect(global.fetch.mock.calls[0][1].credentials).toBe("include");
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });

  it("forgets the tokens a sign-in from before left in storage", () => {
    localStorage.setItem("access_token", "old-access");
    localStorage.setItem("refresh_token", "old-refresh");
    localStorage.setItem("cookie-consent", "granted");

    forgetStoredTokens();

    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(localStorage.getItem("cookie-consent")).toBe("granted");
  });
});
