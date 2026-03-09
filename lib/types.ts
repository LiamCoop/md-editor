/** A single comment on the document */
export interface Comment {
  id: string;
  /** Author's user ID (from next-auth session) */
  authorId: string;
  authorName: string;
  /** Character offset range the comment is anchored to */
  anchorStart: number;
  anchorEnd: number;
  body: string;
  createdAt: number; // unix ms timestamp
  /** Replies are nested comments (no further nesting) */
  replies: Reply[];
  resolved: boolean;
}

export interface Reply {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: number;
}

/** Cursor position for a collaborator */
export interface CursorPosition {
  /** next-auth user id */
  userId: string;
  displayName: string;
  /** Current selection start offset in document content */
  startIndex: number;
  /** Current selection end offset in document content */
  endIndex: number;
  /** Legacy Automerge cursor fields kept for backward compatibility */
  cursor?: string;
  selectionCursor?: string;
  updatedAt: number;
}

/** Root automerge document */
export interface MarkdownDoc {
  /** The markdown content — collaborative text via automerge splice/updateText */
  content: string;
  title: string;
  comments: Comment[];
  /** Map of userId -> cursor position, for presence */
  cursors: Record<string, CursorPosition>;
}

/** Entry in the collaborative document index */
export interface DocumentIndexEntry {
  url: string;
  createdAt: number;
  createdBy: string;
}

/** Root document for listing available markdown documents */
export interface DocumentIndexDoc {
  documents: DocumentIndexEntry[];
}
