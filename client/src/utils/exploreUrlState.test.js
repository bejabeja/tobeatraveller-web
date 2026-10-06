import { exploreSearchParamsFromState, exploreStateFromSearchParams } from "./exploreUrlState";

const parse = (query) => exploreStateFromSearchParams(new URLSearchParams(query));

describe("Explore state in the address", () => {
  it("restores the filters and the sort a person left the page with", () => {
    const state = { filters: { query: "Lisbon", category: "roadtrip", budgetMax: "500", travelersCount: "couple" }, sortBy: "cheapest" };

    const restored = exploreStateFromSearchParams(exploreSearchParamsFromState(state));

    expect(restored).toEqual(state);
  });

  it("keeps the trips by van in the address, so the search can be shared", () => {
    const state = { filters: { byVan: "true" }, sortBy: "recent" };

    expect(exploreSearchParamsFromState(state).toString()).toBe("van=true");
    expect(exploreStateFromSearchParams(exploreSearchParamsFromState(state))).toEqual(state);
  });

  it("ignores a van filter that is not on", () => {
    expect(parse("van=false").filters).toEqual({});
    expect(parse("van=").filters).toEqual({});
  });

  it("keeps the name /explore?location=... already had for the place", () => {
    expect(parse("location=Lisbon").filters).toEqual({ query: "Lisbon" });
  });

  it("leaves the address clean when nothing is filtered and the sort is the default", () => {
    const searchParams = exploreSearchParamsFromState({ filters: { query: "", category: "" }, sortBy: "recent" });

    expect(searchParams.toString()).toBe("");
  });

  it("ignores values that cannot be a filter instead of sending them to the API", () => {
    const { filters, sortBy } = parse("category=nope&budgetMin=abc&durationMax=-3&travelers=crowd&sort=random");

    expect(filters).toEqual({});
    expect(sortBy).toBe("recent");
  });

  it("keeps what else the address carries and replaces what it wrote before", () => {
    const current = new URLSearchParams("utm_source=newsletter&category=relax&sort=liked");

    const searchParams = exploreSearchParamsFromState({ filters: { category: "culture" }, sortBy: "recent" }, current);

    expect(searchParams.toString()).toBe("utm_source=newsletter&category=culture");
  });
});
