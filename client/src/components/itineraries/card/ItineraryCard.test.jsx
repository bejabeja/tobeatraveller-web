import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ItineraryCard from "./ItineraryCard";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("../../../hooks/useLike", () => ({ useLike: () => ({ isLiked: false, likesCount: 0, toggleLike: jest.fn() }) }));
jest.mock("../../../hooks/useScrollReveal", () => ({ useScrollReveal: () => null }));

const TRIP = { id: "t1", title: "Algarve", location: { name: "Portugal" }, tripTotalDays: 4, likesCount: 0, commentsCount: 0 };

const renderCard = (itinerary) => render(<MemoryRouter><ItineraryCard itinerary={itinerary} user={{ username: "ana" }} /></MemoryRouter>);

describe("ItineraryCard photo", () => {
  // Regression: without a photo the card showed a broken image, described in English.
  it("shows the brand placeholder when the trip has no photo", () => {
    const { container } = renderCard({ ...TRIP, photoUrl: null });

    expect(container.querySelector(".itinerary-card__image-placeholder")).toBeInTheDocument();
    expect(container.querySelector(".itinerary-card__image")).not.toBeInTheDocument();
  });

  it("shows the photo, without English text for it, when there is one", () => {
    const { container } = renderCard({ ...TRIP, photoUrl: "https://example.com/a.jpg" });

    expect(container.querySelector(".itinerary-card__image")).toHaveAttribute("alt", "");
  });
});

describe("ItineraryCard by van", () => {
  it("marks a trip made by van, so it is told apart in the list", () => {
    renderCard({ ...TRIP, byVan: true });

    expect(screen.getByTitle("tripByVan.label")).toBeInTheDocument();
  });

  it("marks nothing on a trip that was not", () => {
    renderCard({ ...TRIP, byVan: false });

    expect(screen.queryByTitle("tripByVan.label")).not.toBeInTheDocument();
  });
});
