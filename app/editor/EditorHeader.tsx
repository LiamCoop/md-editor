"use client";

import Link from "next/link";

interface EditorHeaderProps {
  title: string;
  onTitleChange: (nextTitle: string) => void;
  user: {
    name: string;
    email: string;
    image: string | null;
  };
}

function avatarFallback(name: string, email: string): string {
  const source = name.trim() || email.trim() || "U";
  return source.slice(0, 1).toUpperCase();
}

export function EditorHeader({ title, onTitleChange, user }: EditorHeaderProps) {
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
    </header>
  );
}
