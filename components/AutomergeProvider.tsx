"use client";

import type { Repo } from "@automerge/automerge-repo";
import { RepoContext } from "@automerge/automerge-repo-react-hooks";
import { useEffect, useState } from "react";
import { getRepo } from "@/lib/automerge";

export function AutomergeProvider({ children }: { children: React.ReactNode }) {
  const [repo, setRepo] = useState<Repo | null>(null);

  useEffect(() => {
    setRepo(getRepo());
  }, []);

  if (!repo) {
    return null;
  }

  return (
    <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>
  );
}
