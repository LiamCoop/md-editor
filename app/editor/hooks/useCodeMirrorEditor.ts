import { useDocHandle } from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import { getCursor, getCursorPosition } from "@automerge/automerge";
import { automergeSyncPlugin } from "@automerge/automerge-codemirror";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";
import type { Comment, MarkdownDoc } from "@/lib/types";
import {
    editorTheme,
    commentHighlightsField,
    setCommentHighlightsEffect,
} from "../codemirror/extensions";
import {
    remoteCursorsExtension,
    setRemoteCursors,
    type RemoteCursor,
} from "../codemirror/remoteCursors";
import { useCursorPresence } from "./useCursorPresence";

export function useCodeMirrorEditor({
    docUrl,
    user,
    activeDoc,
    comments,
    hoveredCommentId,
    onSelectionChange,
}: {
    docUrl: AutomergeUrl;
    user: { id: string; name: string; email: string; image: string | null };
    activeDoc: MarkdownDoc | undefined;
    comments: Comment[];
    hoveredCommentId: string | null;
    onSelectionChange: (range: { start: number; end: number }) => void;
}) {
    const activeDocHandle = useDocHandle<MarkdownDoc>(docUrl, { suspense: true });
    const hasActiveDoc = Boolean(activeDoc);
    const activeDocContentRef = useRef(activeDoc?.content ?? "");

    const editorHostRef = useRef<HTMLDivElement | null>(null);
    const editorViewRef = useRef<EditorView | null>(null);

    const { collaborators: headerCollaborators, peerCursorData, broadcastCursor } =
        useCursorPresence({ docUrl, user });

    // Keep a ref to broadcastCursor so the CM update listener always has the latest
    const broadcastCursorRef = useRef(broadcastCursor);

    const onSelectionChangeRef = useRef(onSelectionChange);

    // Keep a ref to the doc handle for use inside CM extensions
    const activeDocHandleRef = useRef(activeDocHandle);

    useEffect(() => {
        broadcastCursorRef.current = broadcastCursor;
    }, [broadcastCursor]);

    useEffect(() => {
        onSelectionChangeRef.current = onSelectionChange;
    }, [onSelectionChange]);

    useEffect(() => {
        activeDocHandleRef.current = activeDocHandle;
    }, [activeDocHandle]);

    useEffect(() => {
        activeDocContentRef.current = activeDoc?.content ?? "";
    }, [activeDoc?.content]);

    useEffect(() => {
        if (!hasActiveDoc || !docUrl || !editorHostRef.current || !activeDocHandle) {
            return;
        }

        const view = new EditorView({
            state: EditorState.create({
                doc: activeDocContentRef.current,
                extensions: [
                    markdown(),
                    editorTheme,
                    EditorView.lineWrapping,
                    automergeSyncPlugin({
                        handle: activeDocHandle,
                        path: ["content"],
                    }),
                    remoteCursorsExtension(),
                    commentHighlightsField,
                    EditorView.updateListener.of((update) => {
                        if (!update.selectionSet) return;
                        const { head, anchor } = update.state.selection.main;
                        onSelectionChangeRef.current({ start: head, end: anchor });
                        const doc = activeDocHandleRef.current?.docSync();
                        if (!doc) return;
                        try {
                            const headCursor = getCursor(doc, ["content"], head);
                            const anchorCursor = getCursor(doc, ["content"], anchor);
                            broadcastCursorRef.current(headCursor, anchorCursor);
                        } catch {
                            // Position may be out of range during rapid concurrent edits
                        }
                    }),
                ],
            }),
            parent: editorHostRef.current,
        });

        editorViewRef.current = view;

        return () => {
            view.destroy();
            if (editorViewRef.current === view) {
                editorViewRef.current = null;
            }
        };
    }, [docUrl, hasActiveDoc, activeDocHandle]);

    // Resolve remote cursors to numeric positions and dispatch into CodeMirror
    useEffect(() => {
        const view = editorViewRef.current;
        const handle = activeDocHandleRef.current;
        if (!view || !handle) return;

        const doc = handle.docSync();
        if (!doc) return;

        const resolved: RemoteCursor[] = [];

        for (const peer of peerCursorData) {
            if (!peer.cursor) continue;
            try {
                const head = getCursorPosition(doc, ["content"], peer.cursor.head);
                const anchor = getCursorPosition(doc, ["content"], peer.cursor.anchor);
                resolved.push({
                    head,
                    anchor,
                    displayName: peer.displayName,
                    color: peer.color,
                });
            } catch {
                // Cursor may reference deleted content; skip
            }
        }

        view.dispatch({
            effects: setRemoteCursors.of(resolved),
        });
    }, [peerCursorData, activeDoc]);

    // Sync comment highlights into CodeMirror decorations
    useEffect(() => {
        const view = editorViewRef.current;
        const handle = activeDocHandleRef.current;
        if (!view || !handle) return;
        const doc = handle.docSync();
        if (!doc) return;

        const docLength = view.state.doc.length;
        const highlights = comments
            .map((comment) => {
                try {
                    const from = getCursorPosition(doc, ["content"], comment.anchorStartCursor);
                    const to = getCursorPosition(doc, ["content"], comment.anchorEndCursor);
                    const clampedFrom = Math.max(0, Math.min(from, docLength));
                    const clampedTo = Math.max(clampedFrom, Math.min(to, docLength));
                    if (clampedTo <= clampedFrom) return null;
                    return {
                        from: clampedFrom,
                        to: clampedTo,
                        focused: hoveredCommentId === comment.id,
                    };
                } catch {
                    return null;
                }
            })
            .filter((h): h is NonNullable<typeof h> => h !== null);

        view.dispatch({
            effects: setCommentHighlightsEffect.of(highlights),
        });
    }, [comments, hoveredCommentId, activeDoc]);

    return {
        editorHostRef,
        editorViewRef,
        headerCollaborators,
    };
}
