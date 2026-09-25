import { redactReferralCodes, withoutReferralCode } from "./analyticsEvents";

describe("withoutReferralCode", () => {
  it("replaces the referral code in a shared passport link", () => {
    expect(withoutReferralCode("https://tobeatraveller.com/profile/u1/passport?ref=jane"))
      .toBe("https://tobeatraveller.com/profile/u1/passport?ref=shared");
  });

  it("replaces it wherever it sits among other parameters", () => {
    expect(withoutReferralCode("https://tobeatraveller.com/register?source=passport&ref=jane&x=1#top"))
      .toBe("https://tobeatraveller.com/register?source=passport&ref=shared&x=1#top");
  });

  it("leaves other values alone", () => {
    expect(withoutReferralCode("https://tobeatraveller.com/profile/u1?preference=1")).toBe("https://tobeatraveller.com/profile/u1?preference=1");
    expect(withoutReferralCode(42)).toBe(42);
  });
});

describe("redactReferralCodes", () => {
  it("cleans the URLs PostHog sends with the event and sets on the person", () => {
    const event = redactReferralCodes({
      event: "$pageview",
      properties: {
        $current_url: "https://t.com/profile/u1/passport?ref=jane",
        $referrer: "https://t.com/register?ref=jane",
        $set_once: { $initial_current_url: "https://t.com/profile/u1/passport?ref=jane" },
        from_shared_link: true,
      },
      $set_once: { $initial_referrer: "https://t.com/?ref=jane" },
    });

    expect(event.properties).toMatchObject({
      $current_url: "https://t.com/profile/u1/passport?ref=shared",
      $referrer: "https://t.com/register?ref=shared",
      $set_once: { $initial_current_url: "https://t.com/profile/u1/passport?ref=shared" },
      from_shared_link: true,
    });
    expect(event.$set_once.$initial_referrer).toBe("https://t.com/?ref=shared");
    expect(JSON.stringify(event)).not.toContain("jane");
  });

  it("passes through an event without properties", () => {
    expect(redactReferralCodes({ event: "x" })).toMatchObject({ event: "x" });
    expect(redactReferralCodes(null)).toBeNull();
  });
});
