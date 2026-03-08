"use client";

import { RepoContext } from "@automerge/automerge-repo-react-hooks";
import { repo } from "@/lib/automerge";

export function AutomergeProvider({ children }: { children: React.ReactNode }) {
  return (
    <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>
  );
}
