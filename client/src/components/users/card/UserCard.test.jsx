import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UserCard from "./UserCard";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

const PERSON = { id: "user-2", username: "ana", location: "Lisboa", bio: "Furgo y surf", totalItineraries: 4, avatarUrl: null, lastItinerary: null };

const renderCard = (props = {}) =>
  render(<MemoryRouter><UserCard {...PERSON} isAuthenticated isFollowing={false} onFollowToggle={jest.fn()} {...props} /></MemoryRouter>);

describe("UserCard", () => {
  it("opens the person's profile from their card", () => {
    renderCard();

    expect(screen.getByRole("link", { name: /@ana/ })).toHaveAttribute("href", "/friend-profile/user-2");
  });

  it("follows the person from a button of its own", () => {
    const onFollowToggle = jest.fn();
    renderCard({ onFollowToggle });

    fireEvent.click(screen.getByRole("button", { name: "community.follow" }));

    expect(onFollowToggle).toHaveBeenCalledWith("user-2", false);
  });

  it("says when they are already followed", () => {
    renderCard({ isFollowing: true });

    expect(screen.getByRole("button", { name: "community.following" })).toHaveAttribute("aria-pressed", "true");
  });

  it("offers no follow button on your own card", () => {
    renderCard({ isMe: true });

    expect(screen.queryByRole("button", { name: "community.follow" })).not.toBeInTheDocument();
  });

  it("sends a signed-out visitor to log in, both to see and to follow", () => {
    renderCard({ isAuthenticated: false });

    expect(screen.getByRole("link", { name: /@ana/ })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "community.follow" })).toHaveAttribute("href", "/login");
  });

  // Regression: the photo's description was written in English inside the card.
  it("describes no photo in a fixed language", () => {
    renderCard({ lastItinerary: { title: "Algarve", photoUrl: "https://res.cloudinary.com/x/image/upload/a.jpg" } });

    expect(screen.queryByAltText(/Cover photo|trip/)).not.toBeInTheDocument();
  });
});
