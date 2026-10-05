import { shareTrip } from "./shareTrip";

const URL = "https://tobeatraveller.test/itinerary/t1";

afterEach(() => {
  delete navigator.share;
  delete navigator.clipboard;
});

describe("shareTrip", () => {
  it("uses the share sheet when there is one", async () => {
    navigator.share = jest.fn().mockResolvedValue(undefined);

    await expect(shareTrip({ title: "Algarve", url: URL })).resolves.toBe("native");
    expect(navigator.share).toHaveBeenCalledWith({ title: "Algarve", url: URL });
  });

  it("says nothing was shared when they close the sheet", async () => {
    navigator.share = jest.fn().mockRejectedValue(Object.assign(new Error("cancelled"), { name: "AbortError" }));
    navigator.clipboard = { writeText: jest.fn() };

    await expect(shareTrip({ title: "Algarve", url: URL })).resolves.toBeNull();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("copies the link where there is no share sheet", async () => {
    navigator.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };

    await expect(shareTrip({ title: "Algarve", url: URL })).resolves.toBe("copy");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(URL);
  });

  it("copies the link when the share sheet fails for another reason", async () => {
    navigator.share = jest.fn().mockRejectedValue(new Error("not allowed"));
    navigator.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };

    await expect(shareTrip({ title: "Algarve", url: URL })).resolves.toBe("copy");
  });
});
