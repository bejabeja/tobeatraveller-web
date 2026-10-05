import { returnToState } from "./returnTo";

describe("returnToState", () => {
  it("brings them back to the same page, with its query", () => {
    expect(returnToState({ pathname: "/explore", search: "?location=Lisbon" })).toEqual({ redirectTo: "/explore?location=Lisbon" });
  });

  it("works without a query", () => {
    expect(returnToState({ pathname: "/itinerary/abc" })).toEqual({ redirectTo: "/itinerary/abc" });
  });
});
