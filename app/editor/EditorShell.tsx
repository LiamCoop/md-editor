"use client";

import { useDocument, useDocHandle } from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import { useCallback, useMemo, useState } from "react";
import type { MarkdownDoc } from "@/lib/types";
import type { ViewMode } from "./utils";
import { EditorHeader } from "./EditorHeader";
import { MarkdownPreview } from "./MarkdownPreview";
import { CommentSidebar } from "./CommentSidebar";
import { useDocumentIndex } from "./hooks/useDocumentIndex";
import { useCodeMirrorEditor } from "./hooks/useCodeMirrorEditor";
import { useComments } from "./hooks/useComments";
import { useCommentPositioning } from "./hooks/useCommentPositioning";


interface EditorShellProps {
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    docUrl: AutomergeUrl;
}

export function EditorShell({ user, docUrl }: EditorShellProps) {
    useDocumentIndex({ userId: user.id, docUrl });

    const [activeDoc, changeActiveDoc] = useDocument<MarkdownDoc>(docUrl, {
        suspense: true,
    });

    const activeDocHandle = useDocHandle<MarkdownDoc>(docUrl, { suspense: true });
    const activeDocContent = activeDoc?.content ?? "";

    const [viewMode, setViewMode] = useState<ViewMode>("edit");
    const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });

    const orderedSelection = useMemo(() => {
        const start = Math.min(selectionRange.start, selectionRange.end);
        const end = Math.max(selectionRange.start, selectionRange.end);
        return { start, end };
    }, [selectionRange]);

    const selectedText = useMemo(() => {
        if (!activeDocContent || orderedSelection.end <= orderedSelection.start) return "";
        return activeDocContent.slice(orderedSelection.start, orderedSelection.end);
    }, [activeDocContent, orderedSelection]);

    const hasSelection = orderedSelection.end > orderedSelection.start;

    const commentState = useComments({
        activeDoc,
        changeActiveDoc,
        docHandle: activeDocHandle,
        user,
        orderedSelection,
        selectedText,
        hasSelection,
    });

    const onSelectionChange = useCallback((range: { start: number; end: number }) => {
        setSelectionRange(range);
    }, []);

    const { editorHostRef, editorViewRef, headerCollaborators } =
        useCodeMirrorEditor({
            docUrl,
            user,
            activeDoc,
            comments: commentState.comments,
            hoveredCommentId: commentState.hoveredCommentId,
            onSelectionChange,
        });

    const {
        floatingCommentButtonPosition,
        anchoredCommentPositions,
        pendingCommentTop,
        commentCardRefs,
        pendingCommentRef,
    } = useCommentPositioning({
        editorViewRef,
        editorHostRef,
        docHandle: activeDocHandle,
        comments: commentState.comments,
        pendingComment: commentState.pendingComment,
        orderedSelection,
        hasSelection,
        activeDocUrl: docUrl,
        activeDocContent,
        replyingToCommentId: commentState.replyingToCommentId,
        replyDraft: commentState.replyDraft,
        editingCommentId: commentState.editingCommentId,
        editingCommentDraft: commentState.editingCommentDraft,
        openCommentMenuId: commentState.openCommentMenuId,
    });

    if (!activeDoc) {
        return null;
    }

    const showSidebar = commentState.showCommentsSidebar && viewMode === "edit";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="w-full border-b border-black/10 bg-background px-6 py-4">
                <EditorHeader
                    title={activeDoc.title}
                    onTitleChange={(nextTitle) =>
                        changeActiveDoc((doc) => {
                            doc.title = nextTitle;
                        })
                    }
                    user={user}
                    collaborators={headerCollaborators}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />
            </div>

            <div className={`mx-auto w-full px-6 pt-4 ${viewMode === "split" ? "max-w-450" : showSidebar ? "max-w-[1800px]" : "max-w-330"}`}>
                <div className={`flex gap-3 pb-12 ${viewMode === "split" ? "h-[calc(100vh-6rem)] items-stretch" : "items-start"}`}>
                    <div className={`relative min-w-0 ${viewMode === "preview" ? "hidden" : ""} ${viewMode === "split" ? "w-1/2 overflow-y-auto" : showSidebar ? "flex-3" : "w-full"}`}>
                        <div
                            ref={editorHostRef}
                            className={`relative w-full rounded-lg border border-black/15 bg-white ${viewMode === "split" ? "h-full overflow-y-auto" : ""}`}
                        />

                        {floatingCommentButtonPosition && viewMode === "edit" ? (
                            <button
                                type="button"
                                onClick={commentState.openPendingComment}
                                className="absolute z-20 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition hover:bg-[#e8f0fe]"
                                style={{
                                    top: floatingCommentButtonPosition.top,
                                    left: floatingCommentButtonPosition.left,
                                }}
                                aria-label="Add comment"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    <line x1="12" y1="8" x2="12" y2="14" />
                                    <line x1="9" y1="11" x2="15" y2="11" />
                                </svg>
                            </button>
                        ) : null}
                    </div>

                    {viewMode !== "edit" ? (
                        <div className={viewMode === "preview" ? "w-full" : "w-1/2 min-w-0 h-full"}>
                            <MarkdownPreview content={activeDocContent} className={viewMode === "split" ? "h-full overflow-y-auto" : ""} />
                        </div>
                    ) : null}

                    {showSidebar ? (
                        <CommentSidebar
                            user={user}
                            comments={commentState.comments}
                            hasComments={commentState.hasComments}
                            pendingComment={commentState.pendingComment}
                            setPendingComment={commentState.setPendingComment}
                            pendingCommentTop={pendingCommentTop}
                            pendingCommentRef={pendingCommentRef}
                            anchoredCommentPositions={anchoredCommentPositions}
                            commentCardRefs={commentCardRefs}
                            hoveredCommentId={commentState.hoveredCommentId}
                            setHoveredCommentId={commentState.setHoveredCommentId}
                            replyingToCommentId={commentState.replyingToCommentId}
                            setReplyingToCommentId={commentState.setReplyingToCommentId}
                            replyDraft={commentState.replyDraft}
                            setReplyDraft={commentState.setReplyDraft}
                            editingCommentId={commentState.editingCommentId}
                            editingCommentDraft={commentState.editingCommentDraft}
                            setEditingCommentDraft={commentState.setEditingCommentDraft}
                            openCommentMenuId={commentState.openCommentMenuId}
                            setOpenCommentMenuId={commentState.setOpenCommentMenuId}
                            submitPendingComment={commentState.submitPendingComment}
                            submitReply={commentState.submitReply}
                            toggleResolved={commentState.toggleResolved}
                            startEditingComment={commentState.startEditingComment}
                            cancelEditingComment={commentState.cancelEditingComment}
                            saveEditedComment={commentState.saveEditedComment}
                            deleteComment={commentState.deleteComment}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
