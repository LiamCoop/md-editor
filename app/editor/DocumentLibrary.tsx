"use client";

import { useDocument, useDocuments, useRepo } from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { migrateDocumentsFromLocalStorage, registerDocument } from "./actions";
import type {
  DocumentIndexDoc,
  DocumentListItem,
  MarkdownDoc,
} from "@/lib/types";
import { avatarFallback } from "./utils";

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

interface DocumentLibraryProps {
  documents: DocumentListItem[];
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

function randomInt(max: number): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % max;
}

function generateDicewareTitle(): string {
  return `${DICEWARE_WORDS[randomInt(DICEWARE_WORDS.length)]} ${DICEWARE_WORDS[randomInt(DICEWARE_WORDS.length)]} ${DICEWARE_WORDS[randomInt(DICEWARE_WORDS.length)]}`;
}

function isValidAutomergeUrl(value: string): value is AutomergeUrl {
  return /^automerge:[A-Za-z0-9_-]+$/.test(value.trim());
}

export function DocumentLibrary({ documents, user }: DocumentLibraryProps) {
  const repo = useRepo();
  const router = useRouter();
  const indexStorageKey = `md-editor:index-url:${user.id}`;
  const migrationFlagStorageKey = `md-editor:index-migrated:${user.id}`;
  const [migrationIndexUrl] = useState<AutomergeUrl | undefined>(() =>
    typeof window === "undefined"
      ? undefined
      : ((window.localStorage.getItem(indexStorageKey) as AutomergeUrl | null) ?? undefined),
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDocumentInput, setNewDocumentInput] = useState(generateDicewareTitle());
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(migrationFlagStorageKey) === "true",
  );

  const [indexDoc] = useDocument<DocumentIndexDoc>(migrationIndexUrl, {
    suspense: false,
  });

  const migrationDocumentUrls = useMemo(
    () => (indexDoc?.documents ?? []).map((entry) => entry.url as AutomergeUrl),
    [indexDoc],
  );
  const [migrationDocuments] = useDocuments<MarkdownDoc>(migrationDocumentUrls, {
    suspense: false,
  });

  useEffect(() => {
    if (
      migrationComplete ||
      !migrationIndexUrl ||
      !indexDoc ||
      indexDoc.documents.length === 0
    ) {
      return;
    }

    let cancelled = false;

    const migrate = async () => {
      const entries = indexDoc.documents.map((entry) => {
        const existingDoc = migrationDocuments.get(entry.url as AutomergeUrl);
        return {
          url: entry.url,
          title: existingDoc?.title,
          createdAt: entry.createdAt,
        };
      });

      await migrateDocumentsFromLocalStorage(entries);

      if (cancelled) {
        return;
      }

      window.localStorage.setItem(migrationFlagStorageKey, "true");
      setMigrationComplete(true);
      router.refresh();
    };

    void migrate();

    return () => {
      cancelled = true;
    };
  }, [
    indexDoc,
    migrationComplete,
    migrationDocuments,
    migrationFlagStorageKey,
    migrationIndexUrl,
    router,
  ]);

  const createDocument = async (title: string) => {
    const nextTitle = title.trim() || generateDicewareTitle();
    const handle = repo.create<MarkdownDoc>({
      title: nextTitle,
      content: "",
      comments: [],
    });
    const document = await registerDocument(handle.url, nextTitle);
    router.push(`/editor/${encodeURIComponent(document.id)}`);
    router.refresh();
  };

  const handleOpenCreateModal = async () => {
    const fallbackTitle = generateDicewareTitle();
    setNewDocumentInput(fallbackTitle);
    setIsCreateModalOpen(true);

    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
      return;
    }

    try {
      const clipboardText = (await navigator.clipboard.readText()).trim();
      if (isValidAutomergeUrl(clipboardText)) {
        setNewDocumentInput(clipboardText);
      }
    } catch {
      // Ignore clipboard permission errors and keep fallback title.
    }
  };

  const handleCreateModalSubmit = () => {
    const input = newDocumentInput.trim();
    if (isValidAutomergeUrl(input)) {
      setIsCreateModalOpen(false);
      router.push(`/editor/${encodeURIComponent(input)}`);
      return;
    }

    setIsCreatingDocument(true);
    startTransition(() => {
      void createDocument(input).finally(() => {
        setIsCreatingDocument(false);
        setIsCreateModalOpen(false);
      });
    });
  };

  const handleCopyUrl = async (url: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => {
        setCopiedUrl((current) => (current === url ? null : current));
      }, 1500);
    } catch {
      // Ignore clipboard permission errors.
    }
  };

  const getDocumentShareUrl = (documentId: string) => {
    if (typeof window === "undefined") {
      return `/editor/${encodeURIComponent(documentId)}`;
    }

    return `${window.location.origin}/editor/${encodeURIComponent(documentId)}`;
  };

  const submitLabel = isValidAutomergeUrl(newDocumentInput)
    ? "Go to document"
    : "Create document";

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="text-sm text-black/60">
              Select a document to collaborate in the full-screen editor.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-black/10 bg-white px-3 py-2">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-xs font-semibold">
                  {avatarFallback(user.name, user.email)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-black/60">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Document
            </button>
          </div>
        </header>

        {documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/20 p-6 text-sm text-black/70">
            No documents yet. Create one to start editing.
          </div>
        ) : null}

        <div className="space-y-2">
          {documents.map((document) => {
            return (
              <div
                key={document.id}
                className="rounded-lg border border-black/10 bg-white px-4 py-3 transition hover:border-black/25 hover:bg-black/[0.02]"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/editor/${encodeURIComponent(document.id)}`}
                    className="block min-w-0 truncate text-base font-medium"
                  >
                    {document.title}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(getDocumentShareUrl(document.id))}
                    className="shrink-0 rounded border border-black/15 px-2 py-0.5 text-[11px] font-medium text-black/70 transition hover:bg-black/5"
                    aria-label={`Copy link to ${document.title}`}
                  >
                    {copiedUrl === getDocumentShareUrl(document.id) ? "Copied" : "Copy link"}
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-black/60">
                  <span className="rounded-full bg-black/5 px-2 py-0.5 font-medium text-black/70">
                    {document.role === "owner" ? "Owner" : "Shared with you"}
                  </span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 font-medium text-black/70">
                    {document.visibility === "LINK" ? "Anyone with link" : "Private"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-lg border border-black/10 bg-white p-5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
            <h2 className="text-lg font-semibold">Open or create a document</h2>
            <p className="mt-1 text-sm text-black/60">
              Paste an Automerge URL to join a doc, or enter a title to create one.
            </p>
            <label htmlFor="new-document-input" className="mt-4 block text-sm font-medium">
              Document URL or title
            </label>
            <input
              id="new-document-input"
              type="text"
              value={newDocumentInput}
              onChange={(event) => setNewDocumentInput(event.target.value)}
              className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-md border border-black/15 px-3 py-2 text-sm font-medium transition hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateModalSubmit}
                disabled={isCreatingDocument}
                className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-black/85"
              >
                {isCreatingDocument ? "Working..." : submitLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
