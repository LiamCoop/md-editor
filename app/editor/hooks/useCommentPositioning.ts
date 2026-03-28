import type { Comment } from "@/lib/types";
import type { MarkdownDoc } from "@/lib/types";
import type { DocHandle } from "@automerge/automerge-repo";
import { getCursorPosition } from "@automerge/automerge";
import { type MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import {
    areFloatingPositionsEqual,
    areAnchoredPositionsEqual,
    type FloatingCommentButtonPosition,
    type AnchoredCommentPosition,
    type PendingComment,
} from "../utils";

export function useCommentPositioning({
    editorViewRef,
    editorHostRef,
    docHandle,
    comments,
    pendingComment,
    orderedSelection,
    hasSelection,
    activeDocUrl,
    activeDocContent,
    replyingToCommentId,
    replyDraft,
    editingCommentId,
    editingCommentDraft,
    openCommentMenuId,
}: {
    editorViewRef: MutableRefObject<EditorView | null>;
    editorHostRef: MutableRefObject<HTMLDivElement | null>;
    docHandle: DocHandle<MarkdownDoc> | undefined;
    comments: Comment[];
    pendingComment: PendingComment | null;
    orderedSelection: { start: number; end: number };
    hasSelection: boolean;
    activeDocUrl: string;
    activeDocContent: string;
    replyingToCommentId: string | null;
    replyDraft: string;
    editingCommentId: string | null;
    editingCommentDraft: string;
    openCommentMenuId: string | null;
}) {
    const [floatingCommentButtonPosition, setFloatingCommentButtonPosition] =
        useState<FloatingCommentButtonPosition | null>(null);
    const [anchoredCommentPositions, setAnchoredCommentPositions] = useState<
        Record<string, AnchoredCommentPosition>
    >({});
    const [pendingCommentTop, setPendingCommentTop] = useState<number | null>(null);

    const commentCardRefs = useRef<Record<string, HTMLElement | null>>({});
    const pendingCommentRef = useRef<HTMLElement | null>(null);

    const getAnchorTopForOffset = useCallback((offset: number): number | null => {
        const view = editorViewRef.current;
        const host = editorHostRef.current;
        if (!view || !host) {
            return null;
        }
        const docLength = view.state.doc.length;
        const position = Math.max(0, Math.min(offset, docLength));
        const coords = view.coordsAtPos(position);
        if (!coords) {
            return null;
        }
        const hostRect = host.getBoundingClientRect();
        return Math.max(coords.top - hostRect.top, 0);
    }, [editorViewRef, editorHostRef]);

    const updateFloatingCommentButtonPosition = useCallback(() => {
        if (!hasSelection || pendingComment) {
            setFloatingCommentButtonPosition((current) =>
                current === null ? current : null,
            );
            return;
        }
        const view = editorViewRef.current;
        const host = editorHostRef.current;
        if (!view || !host) {
            setFloatingCommentButtonPosition((current) =>
                current === null ? current : null,
            );
            return;
        }

        const docLength = view.state.doc.length;
        const start = Math.max(0, Math.min(orderedSelection.start, docLength));
        const end = Math.max(start, Math.min(orderedSelection.end, docLength));
        if (end <= start) {
            setFloatingCommentButtonPosition((current) =>
                current === null ? current : null,
            );
            return;
        }

        const startCoords = view.coordsAtPos(start);
        const endCoords = view.coordsAtPos(end) ?? view.coordsAtPos(Math.max(start, end - 1));
        if (!startCoords || !endCoords) {
            setFloatingCommentButtonPosition((current) =>
                current === null ? current : null,
            );
            return;
        }

        const hostRect = host.getBoundingClientRect();
        const buttonSize = 40;
        const gap = 8;
        const rawTop = Math.min(startCoords.top, endCoords.top) - hostRect.top - buttonSize - gap;
        const rawLeft = Math.max(startCoords.right, endCoords.right) - hostRect.left + gap;

        const clampedTop = Math.max(rawTop, gap);
        const clampedLeft = Math.min(
            Math.max(rawLeft, gap),
            Math.max(gap, hostRect.width - buttonSize - gap),
        );

        const nextPosition: FloatingCommentButtonPosition = {
            top: clampedTop,
            left: clampedLeft,
        };
        setFloatingCommentButtonPosition((current) =>
            areFloatingPositionsEqual(current, nextPosition) ? current : nextPosition,
        );
    }, [hasSelection, orderedSelection.end, orderedSelection.start, pendingComment, editorViewRef, editorHostRef]);

    const updateAnchoredCommentPositions = useCallback(() => {
        const doc = docHandle?.docSync();

        const items: Array<{
            id: string;
            kind: "comment" | "pending";
            anchorTop: number;
            createdAt: number;
            height: number;
        }> = [];

        for (const comment of comments) {
            if (!doc) {
                continue;
            }
            try {
                const anchorStart = getCursorPosition(doc, ["content"], comment.anchorStartCursor);
                const anchorTop = getAnchorTopForOffset(anchorStart);
                if (anchorTop === null) {
                    continue;
                }
                const measuredHeight = commentCardRefs.current[comment.id]?.offsetHeight ?? 220;
                items.push({
                    id: comment.id,
                    kind: "comment",
                    anchorTop,
                    createdAt: comment.createdAt,
                    height: measuredHeight,
                });
            } catch {
                // Cursor may reference deleted content; skip
            }
        }

        if (pendingComment && doc) {
            try {
                const pendingAnchorStart = getCursorPosition(doc, ["content"], pendingComment.anchorStartCursor);
                const pendingAnchorTop = getAnchorTopForOffset(pendingAnchorStart);
                if (pendingAnchorTop !== null) {
                    const measuredPendingHeight = pendingCommentRef.current?.offsetHeight ?? 170;
                    items.push({
                        id: "__pending__",
                        kind: "pending",
                        anchorTop: pendingAnchorTop,
                        createdAt: Number.MAX_SAFE_INTEGER,
                        height: measuredPendingHeight,
                    });
                }
            } catch {
                // Cursor may reference deleted content; skip
            }
        }

        items.sort((a, b) => a.anchorTop - b.anchorTop || a.createdAt - b.createdAt);

        const minGap = 14;
        let nextAvailableTop = 0;
        const nextCommentPositions: Record<string, AnchoredCommentPosition> = {};
        let nextPendingTop: number | null = null;

        for (const item of items) {
            const top = Math.max(item.anchorTop, nextAvailableTop);
            nextAvailableTop = top + item.height + minGap;
            if (item.kind === "comment") {
                nextCommentPositions[item.id] = { top };
            } else {
                nextPendingTop = top;
            }
        }

        setAnchoredCommentPositions((current) =>
            areAnchoredPositionsEqual(current, nextCommentPositions)
                ? current
                : nextCommentPositions,
        );
        setPendingCommentTop((current) => (current === nextPendingTop ? current : nextPendingTop));
    }, [comments, getAnchorTopForOffset, pendingComment, docHandle]);

    // Recompute positions on content or selection change
    useEffect(() => {
        updateFloatingCommentButtonPosition();
        updateAnchoredCommentPositions();
    }, [updateFloatingCommentButtonPosition, updateAnchoredCommentPositions, activeDocContent]);

    // Deferred rAF recalc after comment UI state changes
    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            updateAnchoredCommentPositions();
        });
        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [
        comments,
        pendingComment,
        replyingToCommentId,
        replyDraft,
        editingCommentId,
        editingCommentDraft,
        openCommentMenuId,
        updateAnchoredCommentPositions,
    ]);

    // Scroll and resize listeners
    useEffect(() => {
        const host = editorHostRef.current;
        if (!host) {
            return;
        }
        const scroller = host.querySelector(".cm-scroller");
        if (!scroller) {
            return;
        }

        const handleReposition = () => {
            updateFloatingCommentButtonPosition();
            updateAnchoredCommentPositions();
        };

        scroller.addEventListener("scroll", handleReposition);
        window.addEventListener("resize", handleReposition);
        return () => {
            scroller.removeEventListener("scroll", handleReposition);
            window.removeEventListener("resize", handleReposition);
        };
    }, [activeDocUrl, updateFloatingCommentButtonPosition, updateAnchoredCommentPositions, editorHostRef]);

    return {
        floatingCommentButtonPosition,
        anchoredCommentPositions,
        pendingCommentTop,
        commentCardRefs,
        pendingCommentRef,
    };
}
