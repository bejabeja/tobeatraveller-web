jest.mock("../../i18n", () => ({ __esModule: true, default: { t: (key) => key } }));
jest.mock("../../services/auth", () => ({ createNewUser: jest.fn(), login: jest.fn(), logout: jest.fn() }));
jest.mock("../../services/users", () => ({ getUserForAuth: jest.fn() }));
jest.mock("../../utils/analytics", () => ({ resetAnalytics: jest.fn() }));
jest.mock("../user/userInfoActions", () => ({ resetUserInfo: () => ({ type: "@userInfo/reset" }) }));

import { getUserForAuth } from "../../services/users";
import { initAuthUser } from "./authActions";

const HINT = { id: "u1", username: "jane", avatarUrl: null, role: "user" };
const run = async () => {
  const dispatched = [];
  await initAuthUser()((action) => dispatched.push(action));
  return dispatched;
};

beforeEach(() => localStorage.clear());

describe("initAuthUser", () => {
  // Regression: a failed session check (the API down for a moment, a bad
  // connection) signed the user out and sent every private page to /login.
  it("keeps whoever was signed in when the session can't be checked", async () => {
    localStorage.setItem("user_hint", JSON.stringify(HINT));
    getUserForAuth.mockRejectedValue(Object.assign(new Error("down"), { status: 503 }));

    const dispatched = await run();

    expect(dispatched).toEqual([{ type: "@auth/init", payload: HINT }]);
    expect(JSON.parse(localStorage.getItem("user_hint"))).toEqual(HINT);
  });

  it("signs out, and forgets who it was, when there is no session", async () => {
    localStorage.setItem("user_hint", JSON.stringify(HINT));
    getUserForAuth.mockResolvedValue(null);

    const dispatched = await run();

    expect(dispatched[0]).toEqual({ type: "@auth/init", payload: null });
    expect(localStorage.getItem("user_hint")).toBeNull();
  });

  it("stays signed out when the check fails and nobody was signed in", async () => {
    getUserForAuth.mockRejectedValue(new TypeError("Failed to fetch"));

    const dispatched = await run();

    expect(dispatched[0]).toEqual({ type: "@auth/init", payload: null });
  });
});
