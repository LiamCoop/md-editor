"use client";

import { useDocument, useDocuments, useRepo } from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import { useEffect, useMemo } from "react";
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

export function EditorShell({ user }: EditorShellProps) {
  const repo = useRepo();
  const router = useRouter();
  const searchParams = useSearchParams();
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
          <div className="mx-auto max-w-4xl space-y-4">
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
            <textarea
              value={activeDoc.content}
              onChange={(event) =>
                changeActiveDoc((doc) => {
                  doc.content = event.target.value;
                })
              }
              className="h-[70vh] w-full resize-y rounded-lg border border-black/15 bg-white p-4 font-mono text-sm outline-none focus:border-black/40"
              placeholder="Write markdown..."
            />
          </div>
        )}
      </main>
    </div>
  );
}
