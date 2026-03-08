"use client";

import Link from "next/link";
import { useState } from "react";

interface HeaderCollaborator {
  userId: string;
  displayName: string;
  color: string;
  image: string | null;
}

interface EditorHeaderProps {
  title: string;
  onTitleChange: (nextTitle: string) => void;
  user: {
    name: string;
    email: string;
    image: string | null;
  };
  collaborators: HeaderCollaborator[];
}

function avatarFallback(name: string, email: string): string {
  const source = name.trim() || email.trim() || "U";
  return source.slice(0, 1).toUpperCase();
}

function CollaboratorAvatar({ collaborator }: { collaborator: HeaderCollaborator }) {
  if (collaborator.image) {
    return (
      <img
        src={collaborator.image}
        alt={collaborator.displayName}
        className="h-8 w-8 rounded-full border border-black/10 object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-xs font-semibold"
      style={{ color: collaborator.color }}
    >
      {avatarFallback(collaborator.displayName, "")}
    </div>
  );
}

export function EditorHeader({ title, onTitleChange, user, collaborators }: EditorHeaderProps) {
  const [isCollaboratorPopoverOpen, setIsCollaboratorPopoverOpen] = useState(false);
  const visibleAvatars = collaborators.slice(0, 3);
  const extraCount = Math.max(0, collaborators.length - visibleAvatars.length);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href="/editor"
          className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm font-medium transition hover:bg-black/5"
        >
          Documents
        </Link>
        <input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="w-full rounded-lg border border-black/15 bg-white px-4 py-2 text-xl font-semibold outline-none focus:border-black/40"
          placeholder="Document title"
        />
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="relative"
          onMouseEnter={() => setIsCollaboratorPopoverOpen(true)}
          onMouseLeave={() => setIsCollaboratorPopoverOpen(false)}
        >
          <button
            type="button"
            aria-label="Show collaborators"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-full border border-black/10 bg-white px-2 py-1 transition hover:bg-black/5"
          >
            {collaborators.length <= 1 ? (
              <CollaboratorAvatar collaborator={collaborators[0]} />
            ) : (
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {visibleAvatars.map((collaborator) => (
                    <div key={collaborator.userId}>
                      <CollaboratorAvatar collaborator={collaborator} />
                    </div>
                  ))}
                </div>
                {extraCount > 0 ? (
                  <span className="ml-2 text-xs font-semibold text-black/70">+{extraCount}</span>
                ) : null}
              </div>
            )}
          </button>

          {isCollaboratorPopoverOpen ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[220px] rounded-lg border border-black/10 bg-white p-3 shadow-[0_8px_20px_rgba(0,0,0,0.14)]">
              <p className="mb-2 text-xs font-semibold text-black/60">On this document</p>
              <div className="space-y-1">
                {collaborators.map((collaborator) => (
                  <p
                    key={collaborator.userId}
                    className="truncate text-sm font-semibold"
                    style={{ color: collaborator.color }}
                  >
                    {collaborator.displayName}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>

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
      </div>
    </header>
  );
}
