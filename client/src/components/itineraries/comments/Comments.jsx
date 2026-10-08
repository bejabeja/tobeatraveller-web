import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { COMMENT_HIGHLIGHT_DURATION_MS, COMMENTS_PAGE_SIZE, formatTimeAgo, MAX_COMMENT_LENGTH, updateCommentsCount } from "@tobeatraveller/shared";
import {
  addComment,
  deleteComment,
  getCommentsPage,
} from "../../../services/comments";
import { selectMe } from "../../../store/user/userInfoSelectors";
import { returnToState } from "../../../utils/returnTo";
import LoadingButton from "../../LoadingButton";
import Modal from "../../modal/Modal";
import ReportModal from "../../report/ReportModal";
import { trackEvent } from "../../../utils/analytics";
import { ANALYTICS_EVENTS } from "../../../utils/analyticsEvents";
import "./Comments.scss";


const Comments = ({ itineraryId, itineraryOwnerId, isAuthenticated }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [comments, setComments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [commentToReport, setCommentToReport] = useState(null);
  const [reportedCommentIds, setReportedCommentIds] = useState(() => new Set());
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const handledCommentHashRef = useRef(null);

  const dispatch = useDispatch();
  const userMe = useSelector(selectMe);

  const hasMore = comments.length < totalCount;

  const syncCount = (count) => {
    setTotalCount(count);
    dispatch(updateCommentsCount(itineraryId, count));
  };

  const fetchComments = async () => {
    try {
      const page = await getCommentsPage(itineraryId, { limit: COMMENTS_PAGE_SIZE });
      setComments(page.comments);
      setLoadFailed(false);
      setLoadMoreFailed(false);
      syncCount(page.totalCount);
    } catch (error) {
      console.error("Failed to fetch comments", error);
      setLoadFailed(true);
    }
  };

  // From where the list ends, not from a page number: a comment added or deleted meanwhile
  // would otherwise make one skipped or shown twice.
  const loadMore = async () => {
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const page = await getCommentsPage(itineraryId, { limit: COMMENTS_PAGE_SIZE, offset: comments.length });
      // An empty page is the end, whatever the total says: asking again would never end.
      if (page.comments.length === 0) {
        setTotalCount(comments.length);
        return;
      }
      setComments((prev) => {
        const known = new Set(prev.map((comment) => comment.id));
        return [...prev, ...page.comments.filter((comment) => !known.has(comment.id))];
      });
      syncCount(page.totalCount);
    } catch (error) {
      console.error("Failed to load more comments", error);
      setLoadMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (itineraryId) fetchComments();
  }, [itineraryId]);

  useEffect(() => {
    const match = location.hash.match(/^#comment-(.+)$/);
    const targetId = match?.[1];
    if (!targetId || handledCommentHashRef.current === targetId) return;
    if (!comments.some((c) => c.id === targetId)) {
      // The comment linked to may be on a page not loaded yet.
      if (hasMore && !loadingMore && !loadMoreFailed) loadMore();
      return;
    }
    handledCommentHashRef.current = targetId;
    document.getElementById(`comment-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedCommentId(targetId);
    const timeout = setTimeout(() => setHighlightedCommentId(null), COMMENT_HIGHLIGHT_DURATION_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, location.hash, loadingMore, loadMoreFailed]);

  const handleAddComment = async () => {
    if (!newComment.trim() || loading) return;
    setLoading(true);
    try {
      const comment = await addComment(itineraryId, newComment);
      trackEvent(ANALYTICS_EVENTS.COMMENT_POSTED);
      setComments((prev) => [...prev, comment]);
      syncCount(totalCount + 1);
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment", error);
      toast.error(t("comments.couldNotPost"));
    } finally {
      setLoading(false);
    }
  };

  const askToDelete = (commentId) => {
    setCommentToDelete(commentId);
    setIsModalOpen(true);
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      syncCount(Math.max(totalCount - 1, 0));
    } catch (error) {
      console.error("Failed to delete comment", error);
      toast.error(t("comments.couldNotDelete"));
    }
  };

  return (
    <div className="comments">
      <h2 className="comments__title">{t("comments.title")} ({totalCount})</h2>

      <div className="comments__list">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div
              key={comment.id}
              id={`comment-${comment.id}`}
              className={`comment${highlightedCommentId === comment.id ? " comment--highlighted" : ""}`}
            >
              <div className="comment__avatar">
                {comment.user?.avatarUrl ? (
                  <img src={comment.user.avatarUrl} alt={comment.user.username} />
                ) : (
                  comment.user?.username?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="comment__body">
                <strong>@{comment.user?.username}</strong>
                <p>{comment.content}</p>
                {(comment.createdAt || comment.postedAgo) && (
                  <span className="comment__timestamp">{comment.createdAt ? formatTimeAgo(t, comment.createdAt) : comment.postedAgo}</span>
                )}
                {isAuthenticated && comment.user?.id !== userMe?.id && (
                  <div className="comment__actions">
                    {reportedCommentIds.has(comment.id) ? (
                      <span className="comment__reported">{t("report.reported")}</span>
                    ) : (
                      <button type="button" className="comment__report" onClick={() => setCommentToReport(comment.id)}>
                        {t("report.button")}
                      </button>
                    )}
                    {userMe?.id === itineraryOwnerId && (
                      <button type="button" className="comment__delete" onClick={() => askToDelete(comment.id)}>
                        {t("comments.delete")}
                      </button>
                    )}
                  </div>
                )}
                {isAuthenticated && comment.user?.id === userMe?.id && (
                  <div>
                    <button type="button" className="comment__delete" onClick={() => askToDelete(comment.id)}>
                      {t("comments.delete")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : loadFailed ? (
          <p className="comments__empty" role="alert">
            {t("comments.loadFailed")}{" "}
            <button type="button" className="comments__retry" onClick={fetchComments}>{t("common.retry")}</button>
          </p>
        ) : (
          <p className="comments__empty">{t("comments.beFirst")}</p>
        )}
        {hasMore && (
          <div className="comments__more">
            {loadMoreFailed && <p className="comments__empty" role="alert">{t("comments.loadFailed")}</p>}
            <LoadingButton onClick={loadMore} isLoading={loadingMore}>
              {loadMoreFailed ? t("common.retry") : t("common.loadMore")}
            </LoadingButton>
          </div>
        )}
      </div>

      {isAuthenticated ? (
        <div className="comments__form">
          <div className="comments__form-avatar">
            {userMe?.avatarUrl ? (
              <img src={userMe.avatarUrl} alt={userMe.username} />
            ) : (
              <span>{userMe?.username?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="comments__form-input">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t("comments.addComment")}
              rows={1}
              maxLength={MAX_COMMENT_LENGTH}
              enterKeyHint="send"
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent?.isComposing) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            {newComment.trim() && (
              <div className="comments__form-actions">
                <button className="btn btn--ghost btn--sm" onClick={() => setNewComment("")}>{t("comments.cancel")}</button>
                <button onClick={handleAddComment} disabled={loading} className="btn btn--primary btn--sm">
                  {loading ? t("comments.posting") : t("comments.post")}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="comments__login-message">
          <p>
            <Link to="/login" state={returnToState(location)}>{t("comments.logIn")}</Link> {t("comments.loginToComment")}
          </p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCommentToDelete(null);
        }}
        onConfirm={async () => {
          if (commentToDelete) {
            await handleDeleteComment(commentToDelete);
            setIsModalOpen(false);
            setCommentToDelete(null);
          }
        }}
        title={t("comments.confirmDeletion")}
        description={t("comments.deleteDesc")}
        confirmText={t("comments.delete")}
        type="danger"
      />
      <ReportModal
        isOpen={commentToReport !== null}
        onClose={() => setCommentToReport(null)}
        onSent={(commentId) => setReportedCommentIds((previous) => new Set(previous).add(commentId))}
        targetType="comment"
        targetId={commentToReport}
      />
    </div>
  );
};

export default Comments;
