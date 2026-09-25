// The initial state reads the signed-in hint from localStorage when the
// module loads, so each case loads a fresh copy after setting it up.
const loadReducer = (hint) => {
  localStorage.clear();
  if (hint) localStorage.setItem("user_hint", JSON.stringify(hint));
  let reducer;
  jest.isolateModules(() => { ({ authReducer: reducer } = require("./authReducer.js")); });
  return reducer;
};

describe("web authReducer", () => {
  // With the hint of a previous sign-in, private pages show straight away
  // (and move to log in if the session turns out to be gone).
  it("trusts the signed-in hint from the start", () => {
    const authReducer = loadReducer({ id: "u1" });

    expect(authReducer(undefined, { type: "@init" })).toMatchObject({ isAuthenticated: true, isAuthChecked: true });
  });

  // Without it nobody knows yet: private pages wait instead of sending a
  // signed-in user to log in.
  it("waits for the session check without a hint", () => {
    const authReducer = loadReducer(null);

    expect(authReducer(undefined, { type: "@init" })).toMatchObject({ isAuthenticated: false, isAuthChecked: false });
  });

  it("knows the session once it is checked, and after logging in or out", () => {
    const authReducer = loadReducer(null);

    expect(authReducer(undefined, { type: "@auth/init", payload: { id: "u1" } })).toMatchObject({ isAuthenticated: true, isAuthChecked: true });
    expect(authReducer(undefined, { type: "@auth/init", payload: null })).toMatchObject({ isAuthenticated: false, isAuthChecked: true });
    expect(authReducer(undefined, { type: "@auth/login", payload: { id: "u1" } })).toMatchObject({ isAuthChecked: true });
    expect(authReducer(undefined, { type: "@auth/logout" })).toMatchObject({ isAuthenticated: false, isAuthChecked: true });
  });
});
