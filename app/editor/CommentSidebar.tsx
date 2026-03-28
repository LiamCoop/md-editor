import type { Comment } from "@/lib/types";
import type { MutableRefObject } from "react";
import { avatarFallback, formatCommentDate, type AnchoredCommentPosition, type PendingComment } from "./utils";

interface CommentSidebarProps {
    user: { id: string; name: string; email: string; image: string | null };
    comments: Comment[];
    hasComments: boolean;
    pendingComment: PendingComment | null;
    setPendingComment: (value: PendingComment | null) => void;
    pendingCommentTop: number | null;
    pendingCommentRef: MutableRefObject<HTMLElement | null>;
    anchoredCommentPositions: Record<string, AnchoredCommentPosition>;
    commentCardRefs: MutableRefObject<Record<string, HTMLElement | null>>;
    hoveredCommentId: string | null;
    setHoveredCommentId: (id: string | null) => void;
    replyingToCommentId: string | null;
    setReplyingToCommentId: (id: string | null) => void;
    replyDraft: string;
    setReplyDraft: (draft: string) => void;
    editingCommentId: string | null;
    editingCommentDraft: string;
    setEditingCommentDraft: (draft: string) => void;
    openCommentMenuId: string | null;
    setOpenCommentMenuId: (id: string | null) => void;
    submitPendingComment: () => void;
    submitReply: (commentId: string) => void;
    toggleResolved: (commentId: string) => void;
    startEditingComment: (commentId: string, currentBody: string, authorId: string) => void;
    cancelEditingComment: () => void;
    saveEditedComment: (commentId: string) => void;
    deleteComment: (commentId: string, authorId: string) => void;
}

export function CommentSidebar({
    user,
    comments,
    hasComments,
    pendingComment,
    setPendingComment,
    pendingCommentTop,
    pendingCommentRef,
    anchoredCommentPositions,
    commentCardRefs,
    hoveredCommentId,
    setHoveredCommentId,
    replyingToCommentId,
    setReplyingToCommentId,
    replyDraft,
    setReplyDraft,
    editingCommentId,
    editingCommentDraft,
    setEditingCommentDraft,
    openCommentMenuId,
    setOpenCommentMenuId,
    submitPendingComment,
    submitReply,
    toggleResolved,
    startEditingComment,
    cancelEditingComment,
    saveEditedComment,
    deleteComment,
}: CommentSidebarProps) {
    return (
        <aside className="relative min-h-[70vh] min-w-60 max-w-[320px] flex-1">
            {pendingComment && pendingCommentTop !== null ? (
                <article
                    ref={pendingCommentRef}
                    className="absolute left-0 right-0 z-10 rounded-lg border border-black/10 bg-white p-3 shadow-[0_6px_20px_rgba(0,0,0,0.14)]"
                    style={{ top: pendingCommentTop }}
                >
                    <div className="mb-2 flex items-center gap-1.5">
                        {user.image ? (
                            <img
                                src={user.image}
                                alt={user.name}
                                className="h-5 w-5 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[10px] font-semibold">
                                {avatarFallback(user.name, user.email)}
                            </div>
                        )}
                        <p className="truncate text-sm font-medium leading-4">{user.name}</p>
                    </div>

                    <textarea
                        value={pendingComment.body}
                        onChange={(event) =>
                            setPendingComment({
                                ...pendingComment,
                                body: event.target.value,
                            })
                        }
                        className="h-16 w-full resize-none rounded-lg border border-[#1a73e8] bg-white px-3 py-2 text-sm leading-5 outline-none focus:border-[#1a73e8]"
                        placeholder="Comment or add others with @"
                    />
                    <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setPendingComment(null)}
                            className="rounded-full px-4 py-2 text-sm font-medium text-[#0b57d0] transition hover:bg-[#e8f0fe]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={submitPendingComment}
                            disabled={!pendingComment.body.trim()}
                            className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1765c5] disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/35"
                        >
                            Submit
                        </button>
                    </div>
                </article>
            ) : null}

            {hasComments
                ? comments.map((comment) => (
                    <CommentCard
                        key={comment.id}
                        comment={comment}
                        user={user}
                        anchoredPosition={anchoredCommentPositions[comment.id]}
                        commentCardRefs={commentCardRefs}
                        isHovered={hoveredCommentId === comment.id}
                        setHoveredCommentId={setHoveredCommentId}
                        hoveredCommentId={hoveredCommentId}
                        isEditing={editingCommentId === comment.id}
                        editingCommentDraft={editingCommentDraft}
                        setEditingCommentDraft={setEditingCommentDraft}
                        openCommentMenuId={openCommentMenuId}
                        setOpenCommentMenuId={setOpenCommentMenuId}
                        replyingToCommentId={replyingToCommentId}
                        setReplyingToCommentId={setReplyingToCommentId}
                        replyDraft={replyDraft}
                        setReplyDraft={setReplyDraft}
                        submitReply={submitReply}
                        toggleResolved={toggleResolved}
                        startEditingComment={startEditingComment}
                        cancelEditingComment={cancelEditingComment}
                        saveEditedComment={saveEditedComment}
                        deleteComment={deleteComment}
                    />
                ))
                : null}
        </aside>
    );
}

function CommentCard({
    comment,
    user,
    anchoredPosition,
    commentCardRefs,
    isHovered,
    setHoveredCommentId,
    hoveredCommentId,
    isEditing,
    editingCommentDraft,
    setEditingCommentDraft,
    openCommentMenuId,
    setOpenCommentMenuId,
    replyingToCommentId,
    setReplyingToCommentId,
    replyDraft,
    setReplyDraft,
    submitReply,
    toggleResolved,
    startEditingComment,
    cancelEditingComment,
    saveEditedComment,
    deleteComment,
}: {
    comment: Comment;
    user: { id: string; name: string; email: string; image: string | null };
    anchoredPosition: AnchoredCommentPosition | undefined;
    commentCardRefs: MutableRefObject<Record<string, HTMLElement | null>>;
    isHovered: boolean;
    setHoveredCommentId: (id: string | null) => void;
    hoveredCommentId: string | null;
    isEditing: boolean;
    editingCommentDraft: string;
    setEditingCommentDraft: (draft: string) => void;
    openCommentMenuId: string | null;
    setOpenCommentMenuId: (id: string | null) => void;
    replyingToCommentId: string | null;
    setReplyingToCommentId: (id: string | null) => void;
    replyDraft: string;
    setReplyDraft: (draft: string) => void;
    submitReply: (commentId: string) => void;
    toggleResolved: (commentId: string) => void;
    startEditingComment: (commentId: string, currentBody: string, authorId: string) => void;
    cancelEditingComment: () => void;
    saveEditedComment: (commentId: string) => void;
    deleteComment: (commentId: string, authorId: string) => void;
}) {
    const isResolved = Boolean(comment.resolved);
    const isOwner = comment.authorId === user.id;

    if (!anchoredPosition) {
        return null;
    }

    return (
        <article
            ref={(element) => {
                commentCardRefs.current[comment.id] = element;
            }}
            onMouseEnter={() => {
                setHoveredCommentId(comment.id);
            }}
            onMouseLeave={() => {
                if (hoveredCommentId === comment.id) {
                    setHoveredCommentId(null);
                }
            }}
            className={`group absolute left-0 right-0 z-5 rounded-lg p-3 transition ${isHovered
                ? "bg-[#dce3ef] shadow-[0_8px_20px_rgba(0,0,0,0.14)]"
                : isResolved
                    ? "bg-[#ecf0f6]"
                    : "bg-[#e5ebf4]"
                }`}
            style={{ top: anchoredPosition.top }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                    {comment.authorId === user.id && user.image ? (
                        <img
                            src={user.image}
                            alt={comment.authorName}
                            className="h-5 w-5 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[10px] font-semibold text-black/65">
                            {avatarFallback(comment.authorName, "")}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-4 text-black/80">
                            {comment.authorName}
                        </p>
                        <p className="text-xs text-black/65">
                            {formatCommentDate(comment.createdAt)}
                        </p>
                    </div>
                </div>
                {isOwner ? (
                    <div
                        data-comment-menu-root="true"
                        className={`relative flex items-center gap-3 ${isHovered || openCommentMenuId === comment.id
                            ? "opacity-100"
                            : "opacity-0"
                            } transition`}
                    >
                        <button
                            type="button"
                            aria-label="Comment options"
                            onClick={() =>
                                setOpenCommentMenuId(
                                    openCommentMenuId === comment.id ? null : comment.id,
                                )
                            }
                            className="rounded-md px-2 py-1 text-lg leading-none text-black/60 transition hover:bg-black/10"
                        >
                            &#x22EE;
                        </button>
                        {openCommentMenuId === comment.id ? (
                            <div className="absolute right-0 top-8 z-20 w-28 rounded-lg border border-black/10 bg-white p-1 shadow-[0_8px_20px_rgba(0,0,0,0.14)]">
                                <button
                                    type="button"
                                    onClick={() =>
                                        startEditingComment(
                                            comment.id,
                                            comment.body,
                                            comment.authorId,
                                        )
                                    }
                                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-black/80 transition hover:bg-black/5"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => deleteComment(comment.id, comment.authorId)}
                                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                                >
                                    Delete
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
            {isEditing ? (
                <div className="mt-2 rounded-lg bg-white/70 p-2.5">
                    <textarea
                        value={editingCommentDraft}
                        onChange={(event) =>
                            setEditingCommentDraft(event.target.value)
                        }
                        className="h-16 w-full resize-y rounded-lg border border-[#1a73e8] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
                        placeholder="Edit your comment..."
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={cancelEditingComment}
                            className="rounded-full px-3 py-1.5 text-sm font-medium text-[#0b57d0] transition hover:bg-[#e8f0fe]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => saveEditedComment(comment.id)}
                            disabled={!editingCommentDraft.trim()}
                            className="rounded-full bg-[#1a73e8] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1765c5] disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/35"
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className={`mt-2 rounded-lg px-3 py-2 ${isHovered ? "bg-[#c9d1df]" : ""}`}>
                    <p className="whitespace-pre-wrap text-sm leading-5 text-black/70">
                        {comment.body}
                    </p>
                </div>
            )}
            {isResolved ? (
                <p className="mt-2 text-sm text-black/55">
                    Thread resolved
                </p>
            ) : null}
            {!isResolved && (comment.replies?.length ?? 0) > 0 ? (
                <div className="mt-2 space-y-2 pl-3">
                    {comment.replies
                        .slice()
                        .sort((a, b) => a.createdAt - b.createdAt)
                        .map((reply) => (
                            <div
                                key={reply.id}
                                className="rounded-lg bg-white/70 px-3 py-2"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-sm font-semibold text-black/75">
                                        {reply.authorName}
                                    </p>
                                    <p className="text-[11px] text-black/50">
                                        {formatCommentDate(reply.createdAt)}
                                    </p>
                                </div>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-black/70">
                                    {reply.body}
                                </p>
                            </div>
                        ))}
                </div>
            ) : null}
            {!isResolved && !isEditing && replyingToCommentId === comment.id ? (
                <div className="mt-2 rounded-lg bg-white/70 p-2.5">
                    <textarea
                        value={replyDraft}
                        onChange={(event) => setReplyDraft(event.target.value)}
                        className="h-10 w-full resize-none rounded-lg border border-[#1a73e8] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
                        placeholder="Write a reply..."
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setReplyingToCommentId(null);
                                setReplyDraft("");
                            }}
                            className="rounded-full px-3 py-1.5 text-sm font-medium text-[#0b57d0] transition hover:bg-[#e8f0fe]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => submitReply(comment.id)}
                            disabled={!replyDraft.trim()}
                            className="rounded-full bg-[#1a73e8] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1765c5] disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/35"
                        >
                            Reply
                        </button>
                    </div>
                </div>
            ) : null}
            <div className="mt-2 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={() => toggleResolved(comment.id)}
                    className="rounded-full border border-[#0b57d0]/30 bg-white px-3 py-1.5 text-sm font-medium text-[#0b57d0] transition hover:bg-[#e8f0fe]"
                >
                    {isResolved ? "Re-open" : "Resolve"}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setReplyingToCommentId(comment.id);
                        setReplyDraft("");
                    }}
                    disabled={isResolved || isEditing}
                    className="rounded-full bg-[#1a73e8] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1765c5] disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/35"
                >
                    Reply
                </button>
            </div>
        </article>
    );
}
