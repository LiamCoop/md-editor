"use client";

import type { Repo } from "@automerge/automerge-repo";
import { RepoContext } from "@automerge/automerge-repo-react-hooks";
import { useSyncExternalStore } from "react";
import { getRepo } from "@/lib/automerge";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return getRepo();
}

function getServerSnapshot(): Repo | null {
  return null;
}

export function AutomergeProvider({ children }: { children: React.ReactNode }) {
  const repo = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!repo) {
    return null;
  }

  return (
    <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>
  );
}
