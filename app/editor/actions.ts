"use server";

import { DocumentVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type {
  DocumentListItem,
  DocumentMemberRecord,
  MigratableDocumentEntry,
} from "@/lib/types";
import { getOrCreateUser, requireSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  checkDocumentAccessByAutomergeIdentifier,
  type DocumentAccessResult,
} from "@/lib/document-access";

function normalizeTitle(title: string) {
  const nextTitle = title.trim();
  return nextTitle.length > 0 ? nextTitle : "Untitled";
}

function toDocumentListItem(
  document: Awaited<ReturnType<typeof listDocumentsQuery>>[number],
  currentUserId: string,
): DocumentListItem {
  return {
    id: document.id,
    automergeIdentifier: document.automergeIdentifier,
    title: document.title,
    visibility: document.visibility,
    role: document.ownerId === currentUserId ? "owner" : "member",
    owner: {
      id: document.owner.id,
      name: document.owner.name,
      email: document.owner.email,
      image: document.owner.image,
    },
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

async function listDocumentsQuery(userId: string) {
  return db.document.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

async function requireDocumentAccess(documentId: string) {
  const session = await requireSession();
  const currentUser = await getOrCreateUser(session);
  const document = await db.document.findUnique({
    where: { id: documentId },
    include: {
      members: {
        where: { userId: currentUser.id },
        select: { id: true, userId: true },
      },
    },
  });

  if (!document) {
    notFound();
  }

  const isOwner = document.ownerId === currentUser.id;
  const isMember = document.members.length > 0;

  if (!isOwner && !isMember) {
    throw new Error("You do not have access to this document.");
  }

  return {
    currentUser,
    document,
    role: isOwner ? "owner" : ("member" as const),
  };
}

export async function registerDocument(automergeId: string, title: string) {
  const session = await requireSession();
  const currentUser = await getOrCreateUser(session);
  const normalizedTitle = normalizeTitle(title);
  const existingDocument = await db.document.findUnique({
    where: { automergeIdentifier: automergeId },
  });

  if (existingDocument) {
    if (existingDocument.ownerId !== currentUser.id) {
      throw new Error("A document with this identifier already exists.");
    }

    const updated = await db.document.update({
      where: { id: existingDocument.id },
      data: { title: normalizedTitle },
    });

    revalidatePath("/editor");
    return updated;
  }

  const document = await db.document.create({
    data: {
      automergeIdentifier: automergeId,
      title: normalizedTitle,
      ownerId: currentUser.id,
      visibility: DocumentVisibility.PRIVATE,
    },
  });

  revalidatePath("/editor");
  return document;
}

export async function listMyDocuments(): Promise<DocumentListItem[]> {
  const session = await requireSession();
  const currentUser = await getOrCreateUser(session);
  const documents = await listDocumentsQuery(currentUser.id);

  return documents.map((document) => toDocumentListItem(document, currentUser.id));
}

export async function updateDocumentTitle(documentId: string, title: string) {
  const { document } = await requireDocumentAccess(documentId);

  const updated = await db.document.update({
    where: { id: document.id },
    data: { title: normalizeTitle(title) },
  });

  revalidatePath("/editor");
  revalidatePath(`/editor/${encodeURIComponent(updated.id)}`);
  return updated;
}

export async function deleteDocument(documentId: string) {
  const { document, role } = await requireDocumentAccess(documentId);

  if (role !== "owner") {
    throw new Error("Only the owner can delete a document.");
  }

  await db.document.delete({
    where: { id: document.id },
  });

  revalidatePath("/editor");
}

export async function updateDocumentVisibility(
  documentId: string,
  visibility: DocumentVisibility,
) {
  const { document, role } = await requireDocumentAccess(documentId);

  if (role !== "owner") {
    throw new Error("Only the owner can change visibility.");
  }

  const updated = await db.document.update({
    where: { id: document.id },
    data: { visibility },
  });

  revalidatePath("/editor");
  revalidatePath(`/editor/${encodeURIComponent(updated.id)}`);
  return updated;
}

export async function addDocumentMember(documentId: string, email: string) {
  const { document, role } = await requireDocumentAccess(documentId);

  if (role !== "owner") {
    throw new Error("Only the owner can add members.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const targetUser = await db.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },
  });

  if (!targetUser) {
    throw new Error("No user found with that email.");
  }

  if (targetUser.id === document.ownerId) {
    throw new Error("The owner already has access.");
  }

  await db.documentMember.upsert({
    where: {
      documentId_userId: {
        documentId: document.id,
        userId: targetUser.id,
      },
    },
    update: {},
    create: {
      documentId: document.id,
      userId: targetUser.id,
    },
  });

  revalidatePath("/editor");
  revalidatePath(`/editor/${encodeURIComponent(document.id)}`);
}

export async function removeDocumentMember(documentId: string, memberId: string) {
  const { document, role } = await requireDocumentAccess(documentId);

  if (role !== "owner") {
    throw new Error("Only the owner can remove members.");
  }

  await db.documentMember.delete({
    where: {
      documentId_userId: {
        documentId: document.id,
        userId: memberId,
      },
    },
  });

  revalidatePath("/editor");
  revalidatePath(`/editor/${encodeURIComponent(document.id)}`);
}

export async function listDocumentMembers(
  documentId: string,
): Promise<DocumentMemberRecord[]> {
  const { document } = await requireDocumentAccess(documentId);
  const members = await db.documentMember.findMany({
    where: { documentId: document.id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return members.map((member) => ({
    id: member.id,
    userId: member.userId,
    createdAt: member.createdAt.toISOString(),
    user: member.user,
  }));
}

export async function checkDocumentAccess(
  automergeId: string,
): Promise<DocumentAccessResult> {
  const result = await checkDocumentAccessByAutomergeIdentifier(automergeId);
  if (result.allowed && result.role === "link") {
    revalidatePath("/editor");
  }
  return result;
}

export async function migrateDocumentsFromLocalStorage(entries: MigratableDocumentEntry[]) {
  const session = await requireSession();
  const currentUser = await getOrCreateUser(session);

  for (const entry of entries) {
    const automergeId = entry.url.trim();
    if (!automergeId) {
      continue;
    }

    const title = normalizeTitle(entry.title ?? "Untitled");
    const existingDocument = await db.document.findUnique({
      where: { automergeIdentifier: automergeId },
      select: { id: true },
    });

    if (existingDocument) {
      continue;
    }

    await db.document.create({
      data: {
        automergeIdentifier: automergeId,
        title,
        ownerId: currentUser.id,
        visibility: DocumentVisibility.PRIVATE,
      },
    });
  }

  revalidatePath("/editor");
}
