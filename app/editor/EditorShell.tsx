"use client";

import { getCursor, getCursorPosition } from "@automerge/automerge";
import type { Cursor } from "@automerge/automerge";
import { useDocument, useDocuments, useRepo } from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import { EditorState, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { Decoration, EditorView } from "@codemirror/view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DocumentIndexDoc, MarkdownDoc } from "@/lib/types";

const DICEWARE_WORDS = [
  "amber",
  "anchor",
  "apricot",
  "badger",
  "barn",
  "beacon",
  "birch",
  "breeze",
  "cabin",
  "cedar",
  "cinder",
  "cliff",
  "coral",
  "dawn",
  "delta",
  "dune",
  "ember",
  "fern",
  "fjord",
  "flint",
  "frost",
  "glade",
  "grove",
  "harbor",
  "hazel",
  "hearth",
  "hollow",
  "ivory",
  "juniper",
  "lagoon",
  "lumen",
  "maple",
  "meadow",
  "mistral",
  "north",
  "opal",
  "orchid",
  "pebble",
  "pine",
  "prairie",
  "quartz",
  "raven",
  "reef",
  "river",
  "saffron",
  "shore",
  "spruce",
  "summit",
  "thistle",
  "timber",
  "topaz",
  "valley",
  "violet",
  "willow",
  "winter",
];

interface EditorShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface PendingComment {
  anchorStart: number;
  anchorEnd: number;
  selectedText: string;
  body: string;
}

const setCommentHighlightsEffect = StateEffect.define<readonly { from: number; to: number }[]>();

const commentHighlightsField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setCommentHighlightsEffect)) {
        continue;
      }
      const builder = new RangeSetBuilder<Decoration>();
      for (const range of effect.value) {
        if (range.to <= range.from) {
          continue;
        }
        builder.add(range.from, range.to, Decoration.mark({ class: "cm-comment-highlight" }));
      }
      next = builder.finish();
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const editorTheme = EditorView.theme({
  "&": {
    height: "70vh",
  },
  "&.cm-editor": {
    outline: "none",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.875rem",
  },
  ".cm-content": {
    padding: "1rem",
  },
  ".cm-focused": {
    outline: "none",
  },
  ".cm-comment-highlight": {
    backgroundColor: "#f6e8b1",
  },
});

function randomInt(max: number): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % max;
}

function generateDicewareTitle(): string {
  return `${DICEWARE_WORDS[randomInt(DICEWARE_WORDS.length)]} ${DICEWARE_WORDS[randomInt(DICEWARE_WORDS.length)]} ${DICEWARE_WORDS[randomInt(DICEWARE_WORDS.length)]}`;
}

function avatarFallback(name: string, email: string): string {
  const source = name.trim() || email.trim() || "U";
  return source.slice(0, 1).toUpperCase();
}

function toLineAndColumn(text: string, index: number): string {
  const clamped = Math.max(0, Math.min(index, text.length));
  const prefix = text.slice(0, clamped);
  const line = prefix.split("\n").length;
  const lastBreak = prefix.lastIndexOf("\n");
  const column = clamped - (lastBreak + 1) + 1;
  return `L${line}:C${column}`;
}

function formatCommentDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function EditorShell({ user }: EditorShellProps) {
  const repo = useRepo();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });
  const [pendingComment, setPendingComment] = useState<PendingComment | null>(null);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [commentHighlightRange, setCommentHighlightRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const docParam = searchParams.get("doc");
  const activeDocUrl = (docParam ?? undefined) as AutomergeUrl | undefined;
  const indexParam = searchParams.get("index");
  const indexUrl = (indexParam ?? undefined) as AutomergeUrl | undefined;

  const indexStorageKey = `md-editor:index-url:${user.id}`;

  useEffect(() => {
    if (indexUrl) {
      return;
    }

    const existingIndexUrl = window.localStorage.getItem(indexStorageKey) as
      | AutomergeUrl
      | null;
    if (existingIndexUrl) {
      const docQuery = activeDocUrl
        ? `&doc=${encodeURIComponent(activeDocUrl)}`
        : "";
      router.replace(`/editor?index=${encodeURIComponent(existingIndexUrl)}${docQuery}`);
      return;
    }

    const handle = repo.create<DocumentIndexDoc>({ documents: [] });
    window.localStorage.setItem(indexStorageKey, handle.url);
    const docQuery = activeDocUrl ? `&doc=${encodeURIComponent(activeDocUrl)}` : "";
    router.replace(`/editor?index=${encodeURIComponent(handle.url)}${docQuery}`);
  }, [activeDocUrl, indexStorageKey, indexUrl, repo, router]);

  const [indexDoc, changeIndexDoc] = useDocument<DocumentIndexDoc>(indexUrl, {
    suspense: false,
  });

  const documentUrls = useMemo(
    () => (indexDoc?.documents ?? []).map((entry) => entry.url as AutomergeUrl),
    [indexDoc],
  );
  const [documents] = useDocuments<MarkdownDoc>(documentUrls, { suspense: false });
  const [activeDoc, changeActiveDoc] = useDocument<MarkdownDoc>(activeDocUrl, {
    suspense: false,
  });
  const hasActiveDoc = Boolean(activeDoc);
  const activeDocContent = activeDoc?.content ?? "";
  const activeDocContentRef = useRef(activeDocContent);

  useEffect(() => {
    activeDocContentRef.current = activeDocContent;
  }, [activeDocContent]);

  useEffect(() => {
    if (!indexDoc || activeDocUrl) {
      return;
    }
    const firstDoc = indexDoc.documents[0];
    if (!firstDoc) {
      return;
    }
    router.replace(
      `/editor?index=${encodeURIComponent(indexUrl ?? "")}&doc=${encodeURIComponent(firstDoc.url)}`,
    );
  }, [activeDocUrl, indexDoc, indexUrl, router]);

  const createDocument = () => {
    if (!indexDoc) {
      return;
    }
    const title = generateDicewareTitle();
    const handle = repo.create<MarkdownDoc>({
      title,
      content: "",
      comments: [],
      cursors: {},
    });
    changeIndexDoc((doc) => {
      const alreadyExists = doc.documents.some((entry) => entry.url === handle.url);
      if (!alreadyExists) {
        doc.documents.push({
          url: handle.url,
          createdAt: Date.now(),
          createdBy: user.id,
        });
      }
    });
    router.push(
      `/editor?index=${encodeURIComponent(indexUrl ?? "")}&doc=${encodeURIComponent(handle.url)}`,
    );
  };

  const openDocument = (url: string) => {
    router.push(`/editor?index=${encodeURIComponent(indexUrl ?? "")}&doc=${encodeURIComponent(url)}`);
  };

  const updateLocalSelection = useCallback(
    (start: number, end: number) => {
      if (!activeDocUrl) {
        return;
      }

      changeActiveDoc((doc) => {
        if (typeof doc.content !== "string") {
          doc.content = "";
        }
        if (!doc.cursors) {
          doc.cursors = {};
        }

        const startCursor = getCursor(doc, ["content"], start, "after");
        const endCursor = getCursor(doc, ["content"], end, "after");
        const existing = doc.cursors[user.id];
        if (
          existing?.cursor === startCursor &&
          existing.selectionCursor === endCursor &&
          existing.displayName === user.name
        ) {
          return;
        }

        doc.cursors[user.id] = {
          userId: user.id,
          displayName: user.name,
          cursor: startCursor,
          selectionCursor: endCursor,
          updatedAt: Date.now(),
        };
      });
    },
    [activeDocUrl, changeActiveDoc, user.id, user.name],
  );

  useEffect(() => {
    if (!hasActiveDoc || !activeDocUrl || !editorHostRef.current) {
      return;
    }

    const initialDoc = activeDocContentRef.current;
    const view = new EditorView({
      state: EditorState.create({
        doc: initialDoc,
        extensions: [
          markdown(),
          commentHighlightsField,
          editorTheme,
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            const { from, to } = update.state.selection.main;

            if (update.docChanged) {
              const content = update.state.doc.toString();
              setSelectionRange({ start: from, end: to });
              changeActiveDoc((doc) => {
                doc.content = content;
                if (!doc.cursors) {
                  doc.cursors = {};
                }
                const startCursor = getCursor(doc, ["content"], from, "after");
                const endCursor = getCursor(doc, ["content"], to, "after");
                doc.cursors[user.id] = {
                  userId: user.id,
                  displayName: user.name,
                  cursor: startCursor,
                  selectionCursor: endCursor,
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
    activeDocUrl,
    hasActiveDoc,
    changeActiveDoc,
    updateLocalSelection,
    user.id,
    user.name,
  ]);

  useEffect(() => {
    const view = editorViewRef.current;
    if (!view || !hasActiveDoc) {
      return;
    }
    const current = view.state.doc.toString();
    const next = activeDocContent;
    if (current === next) {
      return;
    }

    const selection = view.state.selection.main;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: next },
      selection: {
        anchor: Math.min(selection.anchor, next.length),
        head: Math.min(selection.head, next.length),
      },
    });
  }, [activeDocContent, activeDocUrl, hasActiveDoc]);

  const orderedSelection = useMemo(() => {
    const start = Math.min(selectionRange.start, selectionRange.end);
    const end = Math.max(selectionRange.start, selectionRange.end);
    return { start, end };
  }, [selectionRange.end, selectionRange.start]);

  const selectedText = useMemo(() => {
    const sourceText = activeDocContent;
    if (!sourceText) {
      return "";
    }
    if (orderedSelection.end <= orderedSelection.start) {
      return "";
    }
    return sourceText.slice(orderedSelection.start, orderedSelection.end);
  }, [activeDocContent, orderedSelection.end, orderedSelection.start]);

  const hasSelection = orderedSelection.end > orderedSelection.start;
  const comments = activeDoc?.comments ?? [];
  const hasComments = comments.length > 0;
  const hasCommentMargin = hasComments || Boolean(pendingComment);

  const highlightRange = useCallback(
    (start: number, end: number) => {
      const view = editorViewRef.current;
      if (!view) {
        return;
      }
      const from = Math.max(0, Math.min(start, end));
      const to = Math.max(0, Math.max(start, end));
      const docLength = view.state.doc.length;
      setCommentHighlightRange({
        start: Math.min(from, docLength),
        end: Math.min(to, docLength),
      });
    },
    [],
  );

  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) {
      return;
    }
    if (!commentHighlightRange) {
      view.dispatch({
        effects: setCommentHighlightsEffect.of([]),
      });
      return;
    }
    const docLength = view.state.doc.length;
    const from = Math.max(0, Math.min(commentHighlightRange.start, docLength));
    const to = Math.max(from, Math.min(commentHighlightRange.end, docLength));
    view.dispatch({
      effects: setCommentHighlightsEffect.of([{ from, to }]),
    });
  }, [commentHighlightRange, activeDocUrl]);

  const openPendingComment = () => {
    if (!hasSelection || !selectedText.trim()) {
      return;
    }

    setPendingComment({
      anchorStart: orderedSelection.start,
      anchorEnd: orderedSelection.end,
      selectedText,
      body: "",
    });
  };

  const submitPendingComment = () => {
    if (!activeDoc || !pendingComment || !pendingComment.body.trim()) {
      return;
    }

    const body = pendingComment.body.trim();
    const anchorStart = pendingComment.anchorStart;
    const anchorEnd = pendingComment.anchorEnd;

    const commentId = crypto.randomUUID();
    changeActiveDoc((doc) => {
      if (!doc.comments) {
        doc.comments = [];
      }
      doc.comments.push({
        id: commentId,
        authorId: user.id,
        authorName: user.name,
        anchorStart,
        anchorEnd,
        body,
        createdAt: Date.now(),
        replies: [],
        resolved: false,
      });
    });

    setPendingComment(null);
    setHoveredCommentId(commentId);
    highlightRange(anchorStart, anchorEnd);
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
      setCommentHighlightRange(null);
    }
    if (replyingToCommentId === commentId) {
      setReplyingToCommentId(null);
      setReplyDraft("");
    }
    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setEditingCommentDraft("");
    }
  };

  const collaboratorCursors = useMemo(() => {
    if (!activeDoc?.cursors) {
      return [];
    }

    return Object.values(activeDoc.cursors)
      .filter((entry) => entry.userId !== user.id)
      .map((entry) => {
        let startIndex = 0;
        let endIndex = 0;
        try {
          startIndex = getCursorPosition(activeDoc, ["content"], entry.cursor as Cursor);
          endIndex = getCursorPosition(
            activeDoc,
            ["content"],
            (entry.selectionCursor ?? entry.cursor) as Cursor,
          );
        } catch {
          startIndex = 0;
          endIndex = 0;
        }

        return {
          ...entry,
          startIndex,
          endIndex,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [activeDoc, user.id]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-80 border-r border-black/10 bg-black/[0.03] p-4">
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-black/10 bg-background p-3">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-sm font-semibold">
              {avatarFallback(user.name, user.email)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-black/60">{user.email}</p>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide">Documents</h2>
          <button
            type="button"
            onClick={createDocument}
            disabled={!indexDoc}
            className="rounded-md bg-black px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            New
          </button>
        </div>

        <div className="space-y-1">
          {(indexDoc?.documents ?? []).map((entry) => {
            const doc = documents.get(entry.url as AutomergeUrl);
            const isActive = activeDocUrl === entry.url;
            return (
              <button
                type="button"
                key={entry.url}
                onClick={() => openDocument(entry.url)}
                className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? "border-black/30 bg-white"
                    : "border-transparent hover:border-black/10 hover:bg-white/70"
                }`}
              >
                <p className="truncate font-medium">{doc?.title ?? "Untitled"}</p>
                <p className="truncate text-xs text-black/60">{entry.url}</p>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 p-8">
        {!activeDoc ? (
          <div className="rounded-lg border border-dashed border-black/20 p-8 text-sm text-black/70">
            Pick a document from the sidebar or create a new one.
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div
              className={`flex gap-6 ${
                hasCommentMargin ? "flex-col lg:flex-row lg:items-start" : ""
              }`}
            >
              <section className={`${hasCommentMargin ? "min-w-0 flex-1" : "w-full"}`}>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={activeDoc.title}
                    onChange={(event) =>
                      changeActiveDoc((doc) => {
                        doc.title = event.target.value;
                      })
                    }
                    className="w-full rounded-lg border border-black/15 bg-white px-4 py-3 text-2xl font-semibold outline-none focus:border-black/40"
                    placeholder="Document title"
                  />

                  {collaboratorCursors.length > 0 ? (
                    <div className="rounded-lg border border-black/10 bg-white p-3 text-xs">
                      <p className="mb-2 font-semibold text-black/70">Collaborators</p>
                      <div className="space-y-1">
                        {collaboratorCursors.map((entry) => (
                          <p key={entry.userId} className="truncate text-black/70">
                            {entry.displayName} at{" "}
                            {toLineAndColumn(activeDoc.content ?? "", entry.startIndex)}
                            {entry.startIndex !== entry.endIndex
                              ? ` - ${toLineAndColumn(activeDoc.content ?? "", entry.endIndex)}`
                              : ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="relative">
                    {hasSelection && !pendingComment ? (
                      <div className="absolute -right-14 top-10 z-20 hidden lg:block">
                        <div className="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.16)]">
                          <button
                            type="button"
                            onClick={openPendingComment}
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
                      className="h-[70vh] w-full rounded-lg border border-black/15 bg-white"
                    />
                  </div>
                </div>
              </section>

              {hasCommentMargin ? (
                <aside className="w-full shrink-0 space-y-3 lg:sticky lg:top-8 lg:w-[420px]">
                  {pendingComment ? (
                    <article className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_6px_20px_rgba(0,0,0,0.14)]">
                      <div className="mb-3 flex items-center gap-2">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-xs font-semibold">
                            {avatarFallback(user.name, user.email)}
                          </div>
                        )}
                        <p className="truncate text-xl font-medium leading-6">{user.name}</p>
                      </div>

                      <textarea
                        value={pendingComment.body}
                        onChange={(event) =>
                          setPendingComment((current) =>
                            current
                              ? {
                                  ...current,
                                  body: event.target.value,
                                }
                              : current,
                          )
                        }
                        className="h-11 w-full resize-none rounded-full border border-[#1a73e8] bg-white px-4 py-2 text-base leading-6 outline-none focus:border-[#1a73e8]"
                        placeholder="Comment or add others with @"
                      />
                      <p className="mt-2 max-h-10 overflow-hidden text-xs text-black/55">
                        {toLineAndColumn(activeDoc.content ?? "", pendingComment.anchorStart)}
                        {" - "}
                        {toLineAndColumn(activeDoc.content ?? "", pendingComment.anchorEnd)}
                        {" · "}
                        {pendingComment.selectedText}
                      </p>
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

                  {comments.length > 0 ? (
                    <p className="px-1 text-xs font-semibold uppercase tracking-wide text-black/55">
                      Comments ({comments.length})
                    </p>
                  ) : null}

                  <div className="max-h-[78vh] space-y-2 overflow-y-auto pr-1">
                    {comments
                      .slice()
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map((comment) => {
                        const isHovered = hoveredCommentId === comment.id;
                        const isResolved = Boolean(comment.resolved);
                        const isOwner = comment.authorId === user.id;
                        const isEditing = editingCommentId === comment.id;
                        return (
                          <article
                            key={comment.id}
                            onMouseEnter={() => {
                              setHoveredCommentId(comment.id);
                              highlightRange(comment.anchorStart, comment.anchorEnd);
                            }}
                            onMouseLeave={() => {
                              if (hoveredCommentId === comment.id) {
                                setHoveredCommentId(null);
                                setCommentHighlightRange(null);
                              }
                            }}
                            className={`group rounded-2xl p-4 transition ${
                              isHovered
                                ? "bg-[#dce3ef] shadow-[0_8px_20px_rgba(0,0,0,0.14)]"
                                : isResolved
                                  ? "bg-[#ecf0f6]"
                                  : "bg-[#e5ebf4]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                {comment.authorId === user.id && user.image ? (
                                  <img
                                    src={user.image}
                                    alt={comment.authorName}
                                    className="mt-0.5 h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-xs font-semibold text-black/65">
                                    {avatarFallback(comment.authorName, "")}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-base font-semibold leading-5 text-black/80">
                                    {comment.authorName}
                                  </p>
                                  <p className="text-xs text-black/65">
                                    {formatCommentDate(comment.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`flex items-center gap-3 ${
                                  isHovered ? "opacity-100" : "opacity-0"
                                } transition`}
                              >
                                <button
                                  type="button"
                                  aria-label="Comment options"
                                  className="text-lg leading-none text-black/60"
                                >
                                  ⋮
                                </button>
                              </div>
                            </div>
                            {isEditing ? (
                              <div className="mt-2 rounded-xl bg-white/70 p-2.5">
                                <textarea
                                  value={editingCommentDraft}
                                  onChange={(event) =>
                                    setEditingCommentDraft(event.target.value)
                                  }
                                  className="h-16 w-full resize-y rounded-xl border border-[#1a73e8] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
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
                              <div className={`mt-2 rounded-xl px-3 py-2 ${isHovered ? "bg-[#c9d1df]" : ""}`}>
                                <p className="whitespace-pre-wrap text-base leading-6 text-black/70">
                                  {comment.body}
                                </p>
                              </div>
                            )}
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleResolved(comment.id)}
                                className="rounded-full border border-[#0b57d0]/30 bg-white px-3 py-1.5 text-sm font-medium text-[#0b57d0] transition hover:bg-[#e8f0fe]"
                              >
                                {isResolved ? "Re-open" : "Resolve"}
                              </button>
                              {isOwner ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    startEditingComment(comment.id, comment.body, comment.authorId)
                                  }
                                  className="rounded-full border border-black/20 bg-white px-3 py-1.5 text-sm font-medium text-black/75 transition hover:bg-black/5"
                                >
                                  Edit
                                </button>
                              ) : null}
                              {isOwner ? (
                                <button
                                  type="button"
                                  onClick={() => deleteComment(comment.id, comment.authorId)}
                                  className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              ) : null}
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
                                      className="rounded-xl bg-white/70 px-3 py-2"
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
                              <div className="mt-2 rounded-xl bg-white/70 p-2.5">
                                <textarea
                                  value={replyDraft}
                                  onChange={(event) => setReplyDraft(event.target.value)}
                                  className="h-10 w-full resize-none rounded-full border border-[#1a73e8] bg-white px-4 py-2 text-sm outline-none focus:border-[#1a73e8]"
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
                          </article>
                        );
                      })}
                  </div>
                </aside>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
