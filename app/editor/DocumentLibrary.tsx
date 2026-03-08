"use client";

import { useDocument, useDocuments, useRepo } from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

function avatarFallback(name: string, email: string): string {
  const source = name.trim() || email.trim() || "U";
  return source.slice(0, 1).toUpperCase();
}

export function DocumentLibrary({ user }: DocumentLibraryProps) {
  const repo = useRepo();
  const router = useRouter();
  const [indexUrl, setIndexUrl] = useState<AutomergeUrl | undefined>(undefined);
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

  const createDocument = () => {
    if (!indexDoc) {
      return;
    }
    const handle = repo.create<MarkdownDoc>({
      title: generateDicewareTitle(),
      content: "",
      comments: [],
      cursors: {},
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
              onClick={createDocument}
              disabled={!indexDoc}
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              New document
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
              <Link
                key={entry.url}
                href={`/editor/${encodeURIComponent(entry.url)}`}
                className="block rounded-lg border border-black/10 bg-white px-4 py-3 transition hover:border-black/25 hover:bg-black/[0.02]"
              >
                <p className="truncate text-base font-medium">{doc?.title ?? "Untitled"}</p>
                <p className="truncate text-xs text-black/60">{entry.url}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
