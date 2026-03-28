export interface Reply {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  /** Automerge cursor string for the start of the anchored range */
  anchorStartCursor: string;
  /** Automerge cursor string for the end of the anchored range */
  anchorEndCursor: string;
  body: string;
  createdAt: number;
  replies: Reply[];
  resolved: boolean;
}

/** Root automerge document */
export interface MarkdownDoc {
  /** The markdown content — collaborative text via automerge splice/updateText */
  content: string;
  title: string;
  comments: Comment[];
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
