import type { MarkdownDoc } from "@/lib/types";
import type { DocHandle } from "@automerge/automerge-repo";
import { getCursor } from "@automerge/automerge";
import { useEffect, useState } from "react";
import type { PendingComment } from "../utils";

export function useComments({
    activeDoc,
    changeActiveDoc,
    docHandle,
    user,
    orderedSelection,
    selectedText,
    hasSelection,
}: {
    activeDoc: MarkdownDoc | undefined;
    changeActiveDoc: (fn: (doc: MarkdownDoc) => void) => void;
    docHandle: DocHandle<MarkdownDoc> | undefined;
    user: { id: string; name: string; email: string; image: string | null };
    orderedSelection: { start: number; end: number };
    selectedText: string;
    hasSelection: boolean;
}) {
    const [pendingComment, setPendingComment] = useState<PendingComment | null>(null);
    const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
    const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
    const [replyDraft, setReplyDraft] = useState("");
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentDraft, setEditingCommentDraft] = useState("");
    const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);

    const comments = activeDoc?.comments ?? [];
    const hasComments = comments.length > 0;
    const showCommentsSidebar = hasComments || Boolean(pendingComment);

    const openPendingComment = () => {
        if (!hasSelection || !selectedText.trim()) {
            return;
        }

        const doc = docHandle?.docSync();
        if (!doc) {
            return;
        }

        try {
            const startCursor = getCursor(doc, ["content"], orderedSelection.start);
            const endCursor = getCursor(doc, ["content"], orderedSelection.end);

            setPendingComment({
                anchorStartCursor: startCursor,
                anchorEndCursor: endCursor,
                selectedText,
                body: "",
            });
        } catch {
            // Position may be out of range
        }
    };

    const submitPendingComment = () => {
        if (!activeDoc || !pendingComment || !pendingComment.body.trim()) {
            return;
        }

        const body = pendingComment.body.trim();
        const { anchorStartCursor, anchorEndCursor } = pendingComment;

        const commentId = crypto.randomUUID();
        changeActiveDoc((doc) => {
            if (!doc.comments) {
                doc.comments = [];
            }
            doc.comments.push({
                id: commentId,
                authorId: user.id,
                authorName: user.name,
                anchorStartCursor,
                anchorEndCursor,
                body,
                createdAt: Date.now(),
                replies: [],
                resolved: false,
            });
        });

        setPendingComment(null);
        setHoveredCommentId(commentId);
    };

    const submitReply = (commentId: string) => {
        const body = replyDraft.trim();
        if (!activeDoc || !body) {
            return;
        }

        changeActiveDoc((doc) => {
            if (!doc.comments) {
                return;
            }
            const parent = doc.comments.find((comment) => comment.id === commentId);
            if (!parent) {
                return;
            }
            if (!parent.replies) {
                parent.replies = [];
            }
            parent.replies.push({
                id: crypto.randomUUID(),
                authorId: user.id,
                authorName: user.name,
                body,
                createdAt: Date.now(),
            });
        });

        setReplyDraft("");
        setReplyingToCommentId(null);
    };

    const toggleResolved = (commentId: string) => {
        if (!activeDoc) {
            return;
        }

        changeActiveDoc((doc) => {
            if (!doc.comments) {
                return;
            }
            const comment = doc.comments.find((entry) => entry.id === commentId);
            if (!comment) {
                return;
            }
            comment.resolved = !comment.resolved;
        });

        if (replyingToCommentId === commentId) {
            setReplyingToCommentId(null);
            setReplyDraft("");
        }
    };

    const startEditingComment = (commentId: string, currentBody: string, authorId: string) => {
        if (authorId !== user.id) {
            return;
        }
        setOpenCommentMenuId(null);
        setEditingCommentId(commentId);
        setEditingCommentDraft(currentBody);
    };

    const cancelEditingComment = () => {
        setEditingCommentId(null);
        setEditingCommentDraft("");
    };

    const saveEditedComment = (commentId: string) => {
        const body = editingCommentDraft.trim();
        if (!activeDoc || !body) {
            return;
        }

        changeActiveDoc((doc) => {
            if (!doc.comments) {
                return;
            }
            const comment = doc.comments.find((entry) => entry.id === commentId);
            if (!comment || comment.authorId !== user.id) {
                return;
            }
            comment.body = body;
        });

        setEditingCommentId(null);
        setEditingCommentDraft("");
    };

    const deleteComment = (commentId: string, authorId: string) => {
        if (authorId !== user.id) {
            return;
        }

        const shouldDelete = window.confirm("Delete this comment thread?");
        if (!shouldDelete) {
            return;
        }

        changeActiveDoc((doc) => {
            if (!doc.comments) {
                return;
            }
            const index = doc.comments.findIndex((entry) => entry.id === commentId);
            if (index < 0) {
                return;
            }
            if (doc.comments[index].authorId !== user.id) {
                return;
            }
            doc.comments.splice(index, 1);
        });

        if (hoveredCommentId === commentId) {
            setHoveredCommentId(null);
        }
        if (replyingToCommentId === commentId) {
            setReplyingToCommentId(null);
            setReplyDraft("");
        }
        if (editingCommentId === commentId) {
            setEditingCommentId(null);
            setEditingCommentDraft("");
        }
        if (openCommentMenuId === commentId) {
            setOpenCommentMenuId(null);
        }
    };

    // Close comment context menu on outside click
    useEffect(() => {
        if (!openCommentMenuId) {
            return;
        }
        const handleMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-comment-menu-root='true']")) {
                return;
            }
            setOpenCommentMenuId(null);
        };
        document.addEventListener("mousedown", handleMouseDown);
        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [openCommentMenuId]);

    return {
        pendingComment,
        setPendingComment,
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
        comments,
        hasComments,
        showCommentsSidebar,
        openPendingComment,
        submitPendingComment,
        submitReply,
        toggleResolved,
        startEditingComment,
        cancelEditingComment,
        saveEditedComment,
        deleteComment,
    };
}
