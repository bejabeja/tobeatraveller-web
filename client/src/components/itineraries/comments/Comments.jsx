import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  addComment,
  deleteComment,
  getCommentsByItineraryId,
} from "../../../services/comments";
import { selectMe } from "../../../store/user/userInfoSelectors";
import Modal from "../../modal/Modal";
import "./Comments.scss";


const Comments = ({ itineraryId, isAuthenticated }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);

  const userMe = useSelector(selectMe);

  const fetchComments = async () => {
    try {
      const response = await getCommentsByItineraryId(itineraryId);
      setComments(response);
    } catch (error) {
      console.error("Failed to fetch comments", error);
    }
  };

  useEffect(() => {
    if (itineraryId) fetchComments();
  }, [itineraryId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      await addComment(itineraryId, newComment);
      setNewComment("");
      await fetchComments();
    } catch (error) {
      console.error("Failed to add comment", error);
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
    }
  };

  return (
    <div className="comments">
      <h2 className="comments__title">Comments</h2>

      <div className="comments__list">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment__avatar">
                {comment.user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="comment__body">
                <strong>@{comment.user?.username}</strong>
                <p>{comment.content}</p>
                <span className="comment__timestamp">{comment.postedAgo}</span>
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
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : isAuthenticated ? (
          <p className="comments__empty">Be the first to leave a comment!</p>
        ) : null}
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
              placeholder="Add a comment..."
              rows={1}
              enterKeyHint="send"
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            {newComment.trim() && (
              <div className="comments__form-actions">
                <button className="btn btn--ghost btn--sm" onClick={() => setNewComment("")}>Cancel</button>
                <button onClick={handleAddComment} disabled={loading} className="btn btn--primary btn--sm">
                  {loading ? "Posting..." : "Post"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="comments__login-message">
          <p>
            <Link to="/login">Log in</Link> to share your thoughts on this trip.
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
        title="Confirm Deletion"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Comments;
