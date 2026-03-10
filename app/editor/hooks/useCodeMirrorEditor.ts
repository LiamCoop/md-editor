import { useDocHandle } from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import { automergeSyncPlugin } from "@automerge/automerge-codemirror";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MarkdownDoc } from "@/lib/types";
import type { Comment } from "@/lib/types";
import {
    commentHighlightsField,
    collaboratorPresenceField,
    editorTheme,
    setCommentHighlightsEffect,
    setCollaboratorPresenceEffect,
} from "../codemirror/extensions";
import { getUserColor, type CollaboratorCursorPopover } from "../utils";

export function useCodeMirrorEditor({
    docUrl,
    user,
    activeDoc,
    changeActiveDoc,
    comments,
    hoveredCommentId,
    setSelectionRange,
}: {
    docUrl: AutomergeUrl;
    user: { id: string; name: string; email: string; image: string | null };
    activeDoc: MarkdownDoc | undefined;
    changeActiveDoc: (fn: (doc: MarkdownDoc) => void) => void;
    comments: Comment[];
    hoveredCommentId: string | null;
    setSelectionRange: Dispatch<SetStateAction<{ start: number; end: number }>>;
}) {
    const activeDocHandle = useDocHandle<MarkdownDoc>(docUrl, { suspense: true });
    const hasActiveDoc = Boolean(activeDoc);
    const activeDocContent = activeDoc?.content ?? "";
    const activeDocContentRef = useRef(activeDocContent);

    const editorHostRef = useRef<HTMLDivElement | null>(null);
    const editorViewRef = useRef<EditorView | null>(null);

    const [cursorPopover, setCursorPopover] = useState<CollaboratorCursorPopover | null>(null);

    useEffect(() => {
        activeDocContentRef.current = activeDocContent;
    }, [activeDocContent]);

    const updateLocalSelection = useCallback(
        (start: number, end: number) => {
            if (!docUrl) {
                return;
            }

            changeActiveDoc((doc) => {
                if (typeof doc.content !== "string") {
                    doc.content = "";
                }
                if (!doc.cursors) {
                    doc.cursors = {};
                }

                const safeStart = Math.max(0, Math.min(start, doc.content.length));
                const safeEnd = Math.max(0, Math.min(end, doc.content.length));
                const existing = doc.cursors[user.id];
                if (
                    existing?.startIndex === safeStart &&
                    existing.endIndex === safeEnd &&
                    existing.displayName === user.name
                ) {
                    return;
                }

                doc.cursors[user.id] = {
                    userId: user.id,
                    displayName: user.name,
                    startIndex: safeStart,
                    endIndex: safeEnd,
                    updatedAt: Date.now(),
                };
            });
        },
        [docUrl, changeActiveDoc, user.id, user.name],
    );

    // CodeMirror editor setup
    useEffect(() => {
        if (!hasActiveDoc || !docUrl || !editorHostRef.current || !activeDocHandle) {
            return;
        }

        const initialDoc = activeDocContentRef.current;
        const view = new EditorView({
            state: EditorState.create({
                doc: initialDoc,
                extensions: [
                    markdown(),
                    commentHighlightsField,
                    collaboratorPresenceField,
                    editorTheme,
                    EditorView.lineWrapping,
                    automergeSyncPlugin({
                        handle: activeDocHandle,
                        path: ["content"],
                    }),
                    EditorView.updateListener.of((update) => {
                        const { from, to } = update.state.selection.main;

                        if (update.docChanged) {
                            setSelectionRange({ start: from, end: to });
                            const mappedDocLength = update.state.doc.length;
                            const mapIndex = (index: number) => {
                                const mapped = update.changes.mapPos(index, 1);
                                return Math.max(0, Math.min(mapped, mappedDocLength));
                            };
                            changeActiveDoc((doc) => {
                                if (typeof doc.content !== "string") {
                                    doc.content = "";
                                }
                                if (!doc.cursors) {
                                    doc.cursors = {};
                                }

                                for (const cursor of Object.values(doc.cursors)) {
                                    if (!cursor) {
                                        continue;
                                    }
                                    const currentStart =
                                        typeof cursor.startIndex === "number" ? cursor.startIndex : 0;
                                    const currentEnd =
                                        typeof cursor.endIndex === "number" ? cursor.endIndex : currentStart;
                                    cursor.startIndex = mapIndex(currentStart);
                                    cursor.endIndex = mapIndex(currentEnd);
                                }

                                const safeStart = Math.max(0, Math.min(from, mappedDocLength));
                                const safeEnd = Math.max(0, Math.min(to, mappedDocLength));
                                doc.cursors[user.id] = {
                                    userId: user.id,
                                    displayName: user.name,
                                    startIndex: safeStart,
                                    endIndex: safeEnd,
                                    updatedAt: Date.now(),
                                };
                            });
                            return;
                        }

                        if (update.selectionSet) {
                            setSelectionRange({ start: from, end: to });
                            updateLocalSelection(from, to);
                        }
                    }),
                ],
            }),
            parent: editorHostRef.current,
        });

        editorViewRef.current = view;
        const initialSelection = view.state.selection.main;
        setSelectionRange({ start: initialSelection.from, end: initialSelection.to });
        updateLocalSelection(initialSelection.from, initialSelection.to);

        return () => {
            view.destroy();
            if (editorViewRef.current === view) {
                editorViewRef.current = null;
            }
        };
    }, [
        docUrl,
        hasActiveDoc,
        activeDocHandle,
        changeActiveDoc,
        updateLocalSelection,
        user.id,
        user.name,
        setSelectionRange,
    ]);

    // Sync comment highlight decorations into CodeMirror
    useEffect(() => {
        const view = editorViewRef.current;
        if (!view) {
            return;
        }
        const docLength = view.state.doc.length;
        const ranges = comments
            .map((comment) => {
                const from = Math.max(0, Math.min(comment.anchorStart, docLength));
                const to = Math.max(from, Math.min(comment.anchorEnd, docLength));
                if (to <= from) {
                    return null;
                }
                return {
                    from,
                    to,
                    focused: hoveredCommentId === comment.id,
                };
            })
            .filter((range): range is NonNullable<typeof range> => range !== null);

        view.dispatch({
            effects: setCommentHighlightsEffect.of(ranges),
        });
    }, [docUrl, comments, hoveredCommentId]);

    // Collaborator cursor hover popover
    useEffect(() => {
        const host = editorHostRef.current;
        if (!host) {
            return;
        }

        const handleMouseMove = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            const remoteCursor = target?.closest<HTMLElement>(".cm-remote-cursor");
            const remoteSelection = target?.closest<HTMLElement>(".cm-remote-selection");
            const sourceElement = remoteCursor ?? remoteSelection;
            if (!sourceElement) {
                setCursorPopover((current) => (current === null ? current : null));
                return;
            }

            const name = sourceElement.dataset.displayName;
            const color = sourceElement.dataset.color;
            if (!name || !color) {
                setCursorPopover((current) => (current === null ? current : null));
                return;
            }

            const hostRect = host.getBoundingClientRect();
            const sourceRect = sourceElement.getBoundingClientRect();
            const nextPopover: CollaboratorCursorPopover = {
                name,
                color,
                top: sourceRect.top - hostRect.top - 30,
                left: sourceRect.left - hostRect.left + 6,
            };
            setCursorPopover((current) => {
                if (
                    current &&
                    current.name === nextPopover.name &&
                    current.color === nextPopover.color &&
                    current.top === nextPopover.top &&
                    current.left === nextPopover.left
                ) {
                    return current;
                }
                return nextPopover;
            });
        };

        const handleMouseLeave = () => {
            setCursorPopover((current) => (current === null ? current : null));
        };

        host.addEventListener("mousemove", handleMouseMove);
        host.addEventListener("mouseleave", handleMouseLeave);
        return () => {
            host.removeEventListener("mousemove", handleMouseMove);
            host.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [docUrl]);

    const collaboratorCursors = useMemo(() => {
        if (!activeDoc?.cursors) {
            return [];
        }

        return Object.values(activeDoc.cursors)
            .filter((entry) => entry.userId !== user.id)
            .map((entry) => {
                const startIndex = typeof entry.startIndex === "number" ? entry.startIndex : 0;
                const endIndex = typeof entry.endIndex === "number" ? entry.endIndex : startIndex;

                return {
                    ...entry,
                    startIndex,
                    endIndex,
                    color: getUserColor(entry.userId),
                };
            })
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [activeDoc, user.id]);

    const headerCollaborators = useMemo(() => {
        const collaboratorsById = new Map<
            string,
            {
                userId: string;
                displayName: string;
                updatedAt: number;
            }
        >();

        for (const entry of Object.values(activeDoc?.cursors ?? {})) {
            collaboratorsById.set(entry.userId, {
                userId: entry.userId,
                displayName: entry.displayName,
                updatedAt: entry.updatedAt,
            });
        }

        if (!collaboratorsById.has(user.id)) {
            collaboratorsById.set(user.id, {
                userId: user.id,
                displayName: user.name,
                updatedAt: Date.now(),
            });
        }

        return Array.from(collaboratorsById.values())
            .sort((a, b) => {
                if (a.userId === user.id) {
                    return -1;
                }
                if (b.userId === user.id) {
                    return 1;
                }
                return b.updatedAt - a.updatedAt;
            })
            .map((entry) => ({
                userId: entry.userId,
                displayName: entry.displayName,
                color: getUserColor(entry.userId),
                image: entry.userId === user.id ? user.image : null,
            }));
    }, [activeDoc?.cursors, user.id, user.image, user.name]);

    // Sync collaborator cursor/selection decorations into CodeMirror
    useEffect(() => {
        const view = editorViewRef.current;
        if (!view) {
            return;
        }
        const docLength = view.state.doc.length;
        const ranges = collaboratorCursors.map((entry) => {
            const from = Math.max(0, Math.min(Math.min(entry.startIndex, entry.endIndex), docLength));
            const to = Math.max(0, Math.min(Math.max(entry.startIndex, entry.endIndex), docLength));
            const cursor = Math.max(0, Math.min(entry.endIndex, docLength));
            return {
                from,
                to,
                cursor,
                color: entry.color,
                userId: entry.userId,
                displayName: entry.displayName,
            };
        });

        view.dispatch({
            effects: setCollaboratorPresenceEffect.of(ranges),
        });
    }, [docUrl, collaboratorCursors]);

    return {
        editorHostRef,
        editorViewRef,
        cursorPopover,
        headerCollaborators,
    };
}
