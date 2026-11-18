import vercelConfig from "../../vercel.json";

const policy = vercelConfig.headers
  .flatMap(({ headers }) => headers)
  .find(({ key }) => key === "Content-Security-Policy").value;

const directive = (name) => policy
  .split(";")
  .map((part) => part.trim().split(/\s+/))
  .find(([directiveName]) => directiveName === name)
  ?.slice(1);

// Regression: the web sent only frame-ancestors, so a script that got into a page could run
// and send what it found anywhere. These are what keep the policy from quietly weakening.
describe("the web's Content Security Policy", () => {
  it("runs only the web's own scripts, never inline ones or ones built from strings", () => {
    const scripts = directive("script-src");

    expect(scripts).toContain("'self'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(scripts).not.toContain("*");
  });

  it("allows nothing it does not name, no plugins, no other base and no framing", () => {
    expect(directive("default-src")).toEqual(["'self'"]);
    expect(directive("object-src")).toEqual(["'none'"]);
    expect(directive("base-uri")).toEqual(["'self'"]);
    expect(directive("form-action")).toEqual(["'self'"]);
    expect(directive("frame-ancestors")).toEqual(["'none'"]);
  });

  // The web would not reach its API at all, and nobody could sign in.
  it("lets the web talk to its API", () => {
    expect(directive("connect-src")).toContain("https://api.tobeatraveller.com");
  });
});
