"use client";

import { useDocument, useDocuments, useRepo } from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DocumentIndexDoc, MarkdownDoc } from "@/lib/types";
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

export function DocumentLibrary({ user }: DocumentLibraryProps) {
  const repo = useRepo();
  const router = useRouter();
  const [indexUrl, setIndexUrl] = useState<AutomergeUrl | undefined>(undefined);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDocumentInput, setNewDocumentInput] = useState(generateDicewareTitle());
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const indexStorageKey = `md-editor:index-url:${user.id}`;

  useEffect(() => {
    const existingIndexUrl = window.localStorage.getItem(indexStorageKey) as
      | AutomergeUrl
      | null;
    if (existingIndexUrl) {
      setIndexUrl(existingIndexUrl);
      return;
    }
    const handle = repo.create<DocumentIndexDoc>({ documents: [] });
    window.localStorage.setItem(indexStorageKey, handle.url);
    setIndexUrl(handle.url);
  }, [indexStorageKey, repo]);

  const [indexDoc, changeIndexDoc] = useDocument<DocumentIndexDoc>(indexUrl, {
    suspense: false,
  });

  const documentUrls = useMemo(
    () => (indexDoc?.documents ?? []).map((entry) => entry.url as AutomergeUrl),
    [indexDoc],
  );
  const [documents] = useDocuments<MarkdownDoc>(documentUrls, { suspense: false });

  const createDocument = (title: string) => {
    if (!indexDoc) {
      return;
    }
    const handle = repo.create<MarkdownDoc>({
      title: title.trim() || generateDicewareTitle(),
      content: "",
    });
    changeIndexDoc((doc) => {
      doc.documents.push({
        url: handle.url,
        createdAt: Date.now(),
        createdBy: user.id,
      });
    });
    router.push(`/editor/${encodeURIComponent(handle.url)}`);
  };

  const handleOpenCreateModal = async () => {
    if (!indexDoc) {
      return;
    }
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

    createDocument(input);
    setIsCreateModalOpen(false);
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
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-black/60">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              disabled={!indexDoc}
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Document
            </button>
          </div>
        </header>

        {indexDoc && indexDoc.documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/20 p-6 text-sm text-black/70">
            No documents yet. Create one to start editing.
          </div>
        ) : null}

        <div className="space-y-2">
          {(indexDoc?.documents ?? []).map((entry) => {
            const doc = documents.get(entry.url as AutomergeUrl);
            return (
              <div
                key={entry.url}
                className="rounded-lg border border-black/10 bg-white px-4 py-3 transition hover:border-black/25 hover:bg-black/[0.02]"
              >
                <Link
                  href={`/editor/${encodeURIComponent(entry.url)}`}
                  className="block truncate text-base font-medium"
                >
                  {doc?.title ?? "Untitled"}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <Link
                    href={`/editor/${encodeURIComponent(entry.url)}`}
                    className="truncate text-xs text-black/60"
                  >
                    {entry.url}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(entry.url)}
                    className="rounded border border-black/15 px-2 py-0.5 text-[11px] font-medium text-black/70 transition hover:bg-black/5"
                    aria-label={`Copy ${doc?.title ?? "document"} URL`}
                  >
                    {copiedUrl === entry.url ? "Copied" : "Copy"}
                  </button>
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
                className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-black/85"
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
