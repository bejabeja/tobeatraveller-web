import { cleanup, renderHook } from "@testing-library/react";
import { usePageMeta } from "./usePageMeta.js";

const getMeta = (key, attr = "name") =>
  document.querySelector(`meta[${attr}="${key}"]`)?.getAttribute("content");

describe("usePageMeta", () => {
  afterEach(() => {
    // Unmount first: usePageMeta's own cleanup writes default tags back,
    // so wiping the DOM before RTL's auto-unmount would just have it re-add them.
    cleanup();
    document.title = "";
    document.querySelectorAll("meta[name], meta[property]").forEach((el) => el.remove());
  });

  it("sets the document title with the ToBeATraveller suffix", () => {
    renderHook(() => usePageMeta({ title: "Explore the world", description: "desc" }));

    expect(document.title).toBe("Explore the world - ToBeATraveller");
  });

  it("sets description, Open Graph and Twitter tags from the same content", () => {
    renderHook(() =>
      usePageMeta({ title: "Community", description: "Meet travellers", image: "https://cdn/img.jpg" })
    );

    expect(getMeta("description")).toBe("Meet travellers");
    expect(getMeta("og:title", "property")).toBe("Community - ToBeATraveller");
    expect(getMeta("og:description", "property")).toBe("Meet travellers");
    expect(getMeta("og:image", "property")).toBe("https://cdn/img.jpg");
    expect(getMeta("twitter:title")).toBe("Community - ToBeATraveller");
    expect(getMeta("twitter:image")).toBe("https://cdn/img.jpg");
  });

  it("falls back to the site hero image when none is provided", () => {
    renderHook(() => usePageMeta({ title: "Contact", description: "Get in touch" }));

    expect(getMeta("og:image", "property")).toBe(`${window.location.origin}/images/hero.jpg`);
  });

  it("truncates the description to 160 characters", () => {
    const longDescription = "a".repeat(200);

    renderHook(() => usePageMeta({ title: "Terms", description: longDescription }));

    expect(getMeta("description")).toHaveLength(160);
  });

  it("does nothing while the title is not yet available (e.g. data still loading)", () => {
    document.title = "ToBeATraveller";

    renderHook(() => usePageMeta({ title: undefined, description: undefined }));

    expect(document.title).toBe("ToBeATraveller");
    expect(getMeta("description")).toBeUndefined();
  });

  it("resets title, description, Open Graph and Twitter tags on unmount", () => {
    const { unmount } = renderHook(() =>
      usePageMeta({ title: "Terms", description: "desc", image: "https://cdn/img.jpg" })
    );
    expect(document.title).toBe("Terms - ToBeATraveller");

    unmount();

    expect(document.title).toBe("ToBeATraveller: your life on the road");
    expect(getMeta("og:title", "property")).toBe("ToBeATraveller: your life on the road");
    expect(getMeta("og:description", "property")).not.toBe("desc");
    expect(getMeta("og:image", "property")).not.toBe("https://cdn/img.jpg");
    expect(getMeta("twitter:image")).not.toBe("https://cdn/img.jpg");
  });
});
