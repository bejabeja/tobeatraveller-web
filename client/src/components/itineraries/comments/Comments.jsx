import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { COMMENT_HIGHLIGHT_DURATION_MS, formatTimeAgo, MAX_COMMENT_LENGTH, updateCommentsCount } from "@tobeatraveller/shared";
import {
  addComment,
  deleteComment,
  getCommentsByItineraryId,
} from "../../../services/comments";
import { selectMe } from "../../../store/user/userInfoSelectors";
import Modal from "../../modal/Modal";
import "./Comments.scss";


const Comments = ({ itineraryId, isAuthenticated }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const handledCommentHashRef = useRef(null);

  const dispatch = useDispatch();
  const userMe = useSelector(selectMe);

  const fetchComments = async () => {
    try {
      const response = await getCommentsByItineraryId(itineraryId);
      setComments(response);
      dispatch(updateCommentsCount(itineraryId, response.length));
    } catch (error) {
      console.error("Failed to fetch comments", error);
    }
  };

  useEffect(() => {
    if (itineraryId) fetchComments();
  }, [itineraryId]);

  useEffect(() => {
    const match = location.hash.match(/^#comment-(.+)$/);
    const targetId = match?.[1];
    if (!targetId || handledCommentHashRef.current === targetId) return;
    if (!comments.some((c) => c.id === targetId)) return;
    handledCommentHashRef.current = targetId;
    document.getElementById(`comment-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedCommentId(targetId);
    const timeout = setTimeout(() => setHighlightedCommentId(null), COMMENT_HIGHLIGHT_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [comments, location.hash]);

  const handleAddComment = async () => {
    if (!newComment.trim() || loading) return;
    setLoading(true);
    try {
      const comment = await addComment(itineraryId, newComment);
      setComments((prev) => {
        const next = [...prev, comment];
        dispatch(updateCommentsCount(itineraryId, next.length));
        return next;
      });
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment", error);
      toast.error(t("comments.couldNotPost"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      await fetchComments();
    } catch (error) {
      console.error("Failed to delete comment", error);
      toast.error(t("comments.couldNotDelete"));
    }
  };

  return (
    <div className="comments">
      <h2 className="comments__title">{t("comments.title")} ({comments.length})</h2>

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
                {isAuthenticated && comment.user?.id === userMe?.id && (
                  <div>
                    <button
                      className="comment__delete"
                      onClick={(e) => {
                        e.preventDefault();
                        setCommentToDelete(comment.id);
                        setIsModalOpen(true);
                      }}
                    >
                      {t("comments.delete")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="comments__empty">{t("comments.beFirst")}</p>
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
            <Link to="/login">{t("comments.logIn")}</Link> {t("comments.loginToComment")}
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
    </div>
  );
};

export default Comments;
