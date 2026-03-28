/** Root automerge document */
export interface MarkdownDoc {
  /** The markdown content — collaborative text via automerge splice/updateText */
  content: string;
  title: string;
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
