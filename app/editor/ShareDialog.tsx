"use client";

import Image from "next/image";
import { startTransition, useState } from "react";
import type { DocumentMemberRecord, DocumentVisibility } from "@/lib/types";
import {
  addDocumentMember,
  listDocumentMembers,
  removeDocumentMember,
  updateDocumentVisibility,
} from "./actions";
import { avatarFallback } from "./utils";

interface ShareDialogProps {
  documentId: string;
  initialMembers: DocumentMemberRecord[];
  initialVisibility: DocumentVisibility;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({
  documentId,
  initialMembers,
  initialVisibility,
  isOpen,
  onClose,
}: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState(initialMembers);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const refreshMembers = async () => {
    const nextMembers = await listDocumentMembers(documentId);
    setMembers(nextMembers);
  };

  const handleAddMember = () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    startTransition(() => {
      void addDocumentMember(documentId, nextEmail)
        .then(async () => {
          setEmail("");
          await refreshMembers();
        })
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : "Unable to add member.");
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    });
  };

  const handleRemoveMember = (memberUserId: string) => {
    setIsSubmitting(true);
    setError(null);

    startTransition(() => {
      void removeDocumentMember(documentId, memberUserId)
        .then(async () => {
          await refreshMembers();
        })
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : "Unable to remove member.");
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    });
  };

  const handleVisibilityChange = (nextVisibility: DocumentVisibility) => {
    setIsSubmitting(true);
    setError(null);

    startTransition(() => {
      void updateDocumentVisibility(documentId, nextVisibility)
        .then(() => {
          setVisibility(nextVisibility);
        })
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : "Unable to update visibility.");
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-xl rounded-lg border border-black/10 bg-white p-5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Share document</h2>
            <p className="mt-1 text-sm text-black/60">
              Control who can discover this document and who can edit it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-black/15 px-3 py-2 text-sm font-medium transition hover:bg-black/5"
          >
            Close
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-black/10 p-4">
          <p className="text-sm font-semibold">Link access</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => handleVisibilityChange("PRIVATE")}
              disabled={isSubmitting}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                visibility === "PRIVATE"
                  ? "bg-black text-white"
                  : "border border-black/15 bg-white text-black/75 hover:bg-black/5"
              }`}
            >
              Private
            </button>
            <button
              type="button"
              onClick={() => handleVisibilityChange("LINK")}
              disabled={isSubmitting}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                visibility === "LINK"
                  ? "bg-black text-white"
                  : "border border-black/15 bg-white text-black/75 hover:bg-black/5"
              }`}
            >
              Anyone with link
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-black/10 p-4">
          <label htmlFor="share-email" className="block text-sm font-semibold">
            Add people by email
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="share-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40"
              placeholder="name@example.com"
            />
            <button
              type="button"
              onClick={handleAddMember}
              disabled={isSubmitting}
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="mt-5 rounded-lg border border-black/10 p-4">
          <p className="text-sm font-semibold">People with access</p>
          <div className="mt-3 space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-black/60">No additional members yet.</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-black/10 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {member.user.image ? (
                      <Image
                        src={member.user.image}
                        alt={member.user.name ?? member.user.email ?? "Member"}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-xs font-semibold">
                        {avatarFallback(member.user.name ?? "", member.user.email ?? "")}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.user.name ?? member.user.email ?? "Unknown user"}
                      </p>
                      <p className="truncate text-xs text-black/60">{member.user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={isSubmitting}
                    className="rounded-md border border-black/15 px-3 py-2 text-sm font-medium transition hover:bg-black/5 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
