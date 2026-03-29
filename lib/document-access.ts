import { DocumentVisibility } from "@prisma/client";
import { requireSession, getOrCreateUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export type DocumentAccessResult = {
  allowed: boolean;
  role: "owner" | "member" | "link" | null;
  document: {
    id: string;
    automergeIdentifier: string;
    title: string;
    visibility: DocumentVisibility;
    ownerId: string;
  } | null;
};

async function buildAccessResult(
  document:
    | {
        id: string;
        automergeIdentifier: string;
        title: string;
        visibility: DocumentVisibility;
        ownerId: string;
        members: Array<{ userId: string }>;
      }
    | null,
): Promise<DocumentAccessResult> {
  const session = await requireSession();
  const currentUser = await getOrCreateUser(session);

  if (!document) {
    return {
      allowed: false,
      role: null,
      document: null,
    };
  }

  if (document.ownerId === currentUser.id) {
    return {
      allowed: true,
      role: "owner",
      document: {
        id: document.id,
        automergeIdentifier: document.automergeIdentifier,
        title: document.title,
        visibility: document.visibility,
        ownerId: document.ownerId,
      },
    };
  }

  if (document.members.length > 0) {
    return {
      allowed: true,
      role: "member",
      document: {
        id: document.id,
        automergeIdentifier: document.automergeIdentifier,
        title: document.title,
        visibility: document.visibility,
        ownerId: document.ownerId,
      },
    };
  }

  if (document.visibility === DocumentVisibility.LINK) {
    await db.documentMember.upsert({
      where: {
        documentId_userId: {
          documentId: document.id,
          userId: currentUser.id,
        },
      },
      update: {},
      create: {
        documentId: document.id,
        userId: currentUser.id,
      },
    });

    return {
      allowed: true,
      role: "link",
      document: {
        id: document.id,
        automergeIdentifier: document.automergeIdentifier,
        title: document.title,
        visibility: document.visibility,
        ownerId: document.ownerId,
      },
    };
  }

  return {
    allowed: false,
    role: null,
    document: {
      id: document.id,
      automergeIdentifier: document.automergeIdentifier,
      title: document.title,
      visibility: document.visibility,
      ownerId: document.ownerId,
    },
  };
}

export async function checkDocumentAccessById(
  documentId: string,
): Promise<DocumentAccessResult> {
  const session = await requireSession();
  const currentUser = await getOrCreateUser(session);
  const document = await db.document.findUnique({
    where: { id: documentId },
    include: {
      members: {
        where: { userId: currentUser.id },
        select: { userId: true },
      },
    },
  });

  return buildAccessResult(document);
}

export async function checkDocumentAccessByAutomergeIdentifier(
  automergeIdentifier: string,
): Promise<DocumentAccessResult> {
  const session = await requireSession();
  const currentUser = await getOrCreateUser(session);
  const document = await db.document.findUnique({
    where: { automergeIdentifier },
    include: {
      members: {
        where: { userId: currentUser.id },
        select: { userId: true },
      },
    },
  });

  return buildAccessResult(document);
}
