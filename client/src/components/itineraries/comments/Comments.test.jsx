import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Comments from "./Comments.jsx";

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: () => ({ id: "me-1", username: "me", avatarUrl: null }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock("../../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../../services/comments", () => ({
  getCommentsPage: jest.fn(),
  addComment: jest.fn(),
  deleteComment: jest.fn(),
}));

import { addComment, deleteComment, getCommentsPage } from "../../../services/comments";
import { trackEvent } from "../../../utils/analytics";
import { ANALYTICS_EVENTS } from "../../../utils/analyticsEvents";

const COMMENTS = [
  { id: "c1", content: "first comment", postedAgo: "2h", user: { id: "u1", username: "alice", avatarUrl: null } },
  { id: "c2", content: "second comment", postedAgo: "1h", user: { id: "u2", username: "bob", avatarUrl: null } },
];

const renderAtHash = (hash) =>
  render(
    <MemoryRouter initialEntries={[`/itinerary/itin-1${hash}`]}>
      <Comments itineraryId="itin-1" isAuthenticated />
    </MemoryRouter>
  );

describe("Comments deep-link scroll/highlight", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    getCommentsPage.mockResolvedValue({ comments: COMMENTS, totalCount: COMMENTS.length });
  });

  it("scrolls to and highlights the comment matching the URL hash", async () => {
    renderAtHash("#comment-c1");

    await waitFor(() => expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1));
    expect(document.getElementById("comment-c1")).toHaveClass("comment--highlighted");
    expect(document.getElementById("comment-c2")).not.toHaveClass("comment--highlighted");
  });

  it("does nothing when the hash doesn't match any loaded comment", async () => {
    renderAtHash("#comment-does-not-exist");

    await screen.findByText("first comment");
    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  // Regression: the effect used to depend only on [comments, location.hash] with no
  // "already handled" guard, so posting or deleting a comment (a new `comments` array
  // reference, same hash) re-fired the scroll and re-flashed the highlight, yanking the
  // user's scroll position away from what they were doing.
  it("does not re-trigger the scroll/highlight when the comments list changes but the hash stays the same", async () => {
    addComment.mockResolvedValue({
      id: "c3", content: "new comment", postedAgo: "just now",
      user: { id: "me-1", username: "me", avatarUrl: null },
    });
    renderAtHash("#comment-c1");
    await waitFor(() => expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1));

    const textarea = screen.getByPlaceholderText("comments.addComment");
    await userEvent.type(textarea, "new comment");
    await userEvent.click(screen.getByRole("button", { name: "comments.post" }));

    await screen.findByText("new comment");
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("counts a posted comment, without what it says", async () => {
    addComment.mockResolvedValue({
      id: "c3", content: "new comment", postedAgo: "just now",
      user: { id: "me-1", username: "me", avatarUrl: null },
    });
    renderAtHash("");

    await userEvent.type(await screen.findByPlaceholderText("comments.addComment"), "new comment");
    await userEvent.click(screen.getByRole("button", { name: "comments.post" }));

    await screen.findByText("new comment");
    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.COMMENT_POSTED);
  });
});

describe("Comments when they cannot be loaded", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it("says so and lets them retry, instead of inviting to be the first to comment", async () => {
    getCommentsPage.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ comments: COMMENTS, totalCount: COMMENTS.length });
    renderAtHash("");

    expect(await screen.findByText(/comments.loadFailed/)).toBeInTheDocument();
    expect(screen.queryByText("comments.beFirst")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "common.retry" }));

    expect(await screen.findByText("first comment")).toBeInTheDocument();
    expect(screen.queryByText(/comments.loadFailed/)).not.toBeInTheDocument();
  });
});

describe("Comments by pages", () => {
  const LATER = [{ id: "c3", content: "third comment", postedAgo: "5m", user: { id: "u3", username: "carol", avatarUrl: null } }];

  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    getCommentsPage.mockReset();
    getCommentsPage.mockResolvedValueOnce({ comments: COMMENTS, totalCount: 3 });
  });

  it("counts all of them, not only the ones loaded, and offers the rest", async () => {
    renderAtHash("");

    expect(await screen.findByText(/comments.title \(3\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "common.loadMore" })).toBeInTheDocument();
  });

  it("loads the next ones from where the list ends, without repeating any, and stops offering more", async () => {
    getCommentsPage.mockResolvedValueOnce({ comments: [COMMENTS[1], ...LATER], totalCount: 3 });
    renderAtHash("");

    await userEvent.click(await screen.findByRole("button", { name: "common.loadMore" }));

    expect(await screen.findByText("third comment")).toBeInTheDocument();
    expect(getCommentsPage).toHaveBeenLastCalledWith("itin-1", expect.objectContaining({ offset: 2 }));
    expect(screen.getAllByText("second comment")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "common.loadMore" })).not.toBeInTheDocument();
  });

  // Regression-in-waiting: a link from a notification to a comment on a later page found nothing and stayed at the top.
  it("keeps loading until it finds the comment a link points to", async () => {
    getCommentsPage.mockResolvedValueOnce({ comments: LATER, totalCount: 3 });
    renderAtHash("#comment-c3");

    await waitFor(() => expect(document.getElementById("comment-c3")).toHaveClass("comment--highlighted"));
  });

  // Regression-in-waiting: a total that promised more than the list had made a link to a comment ask for pages for ever.
  it("stops asking for more when a page comes back empty although the total promised more", async () => {
    getCommentsPage.mockResolvedValueOnce({ comments: [], totalCount: 3 });
    renderAtHash("#comment-nowhere");

    await screen.findByText("first comment");
    await waitFor(() => expect(screen.queryByRole("button", { name: "common.loadMore" })).not.toBeInTheDocument());
    expect(getCommentsPage).toHaveBeenCalledTimes(2);
  });

  it("says it could not load more, and lets them try again", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    getCommentsPage.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ comments: LATER, totalCount: 3 });
    renderAtHash("");

    await userEvent.click(await screen.findByRole("button", { name: "common.loadMore" }));
    expect(await screen.findByText("comments.loadFailed")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "common.retry" }));

    expect(await screen.findByText("third comment")).toBeInTheDocument();
  });

  it("takes a deleted comment off the list and out of the count without asking for the list again", async () => {
    deleteComment.mockResolvedValue();
    getCommentsPage.mockReset();
    getCommentsPage.mockResolvedValueOnce({ comments: [{ ...COMMENTS[0], user: { id: "me-1", username: "me" } }, COMMENTS[1]], totalCount: 2 });
    renderAtHash("");

    await userEvent.click(await screen.findByRole("button", { name: "comments.delete" }));
    await userEvent.click(screen.getAllByRole("button", { name: "comments.delete" }).at(-1));

    await waitFor(() => expect(screen.queryByText("first comment")).not.toBeInTheDocument());
    expect(screen.getByText(/comments.title \(1\)/)).toBeInTheDocument();
    expect(getCommentsPage).toHaveBeenCalledTimes(1);
  });
});
