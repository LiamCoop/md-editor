"use client";

import { useDocument } from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import { useMemo, useState } from "react";
import type { MarkdownDoc } from "@/lib/types";
import type { ViewMode } from "./utils";
import { EditorHeader } from "./EditorHeader";
import { CommentSidebar } from "./CommentSidebar";
import { MarkdownPreview } from "./MarkdownPreview";
import { useDocumentIndex } from "./hooks/useDocumentIndex";
import { useComments } from "./hooks/useComments";
import { useCodeMirrorEditor } from "./hooks/useCodeMirrorEditor";
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

    const activeDocContent = activeDoc?.content ?? "";

    const [viewMode, setViewMode] = useState<ViewMode>("edit");
    const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });

    const orderedSelection = useMemo(() => {
        const start = Math.min(selectionRange.start, selectionRange.end);
        const end = Math.max(selectionRange.start, selectionRange.end);
        return { start, end };
    }, [selectionRange.end, selectionRange.start]);

    const selectedText = useMemo(() => {
        if (!activeDocContent) {
            return "";
        }
        if (orderedSelection.end <= orderedSelection.start) {
            return "";
        }
        return activeDocContent.slice(orderedSelection.start, orderedSelection.end);
    }, [activeDocContent, orderedSelection.end, orderedSelection.start]);

    const hasSelection = orderedSelection.end > orderedSelection.start;

    const commentState = useComments({
        activeDoc,
        changeActiveDoc,
        user,
        orderedSelection,
        selectedText,
        hasSelection,
    });

    const { editorHostRef, editorViewRef, cursorPopover, headerCollaborators } =
        useCodeMirrorEditor({
            docUrl,
            user,
            activeDoc,
            changeActiveDoc,
            comments: commentState.comments,
            hoveredCommentId: commentState.hoveredCommentId,
            setSelectionRange,
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

            <div className={`mx-auto w-full px-6 pt-4 ${viewMode === "split" ? "max-w-[1800px]" : "max-w-330"}`}>
                <div className={`flex gap-3 pb-12 ${viewMode === "split" ? "h-[calc(100vh-6rem)] items-stretch" : "items-start"}`}>
                    <div className={`relative min-w-0 ${viewMode === "preview" ? "hidden" : ""} ${viewMode === "split" ? "w-1/2 overflow-y-auto" : "w-full"} ${viewMode === "edit" && commentState.showCommentsSidebar ? "flex-3" : ""}`}>
                        {viewMode === "edit" && hasSelection && !commentState.pendingComment && floatingCommentButtonPosition ? (
                            <div
                                className="absolute z-20"
                                style={{
                                    top: floatingCommentButtonPosition.top,
                                    left: floatingCommentButtonPosition.left,
                                }}
                            >
                                <div className="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.16)]">
                                    <button
                                        type="button"
                                        onClick={commentState.openPendingComment}
                                        aria-label="Add comment"
                                        className="flex h-10 w-10 items-center justify-center border-b border-black/10 text-lg font-semibold leading-none text-[#0b57d0] transition hover:bg-[#e8f0fe]"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div
                            ref={editorHostRef}
                            className={`relative w-full rounded-lg border border-black/15 bg-white ${viewMode === "split" ? "h-full overflow-y-auto" : ""}`}
                        >
                            {cursorPopover ? (
                                <div
                                    className="pointer-events-none absolute z-30 rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold shadow-[0_4px_10px_rgba(0,0,0,0.15)]"
                                    style={{
                                        top: Math.max(cursorPopover.top, 6),
                                        left: Math.max(cursorPopover.left, 6),
                                        color: cursorPopover.color,
                                    }}
                                >
                                    {cursorPopover.name}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {viewMode !== "edit" ? (
                        <div className={viewMode === "preview" ? "w-full" : "w-1/2 min-w-0 h-full"}>
                            <MarkdownPreview content={activeDocContent} className={viewMode === "split" ? "h-full overflow-y-auto" : ""} />
                        </div>
                    ) : null}

                    {viewMode !== "split" && commentState.showCommentsSidebar ? (
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
