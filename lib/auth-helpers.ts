import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/authOptions";
import { db } from "./db";

type SessionIdentity = {
  authProvider: string;
  authUserId: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

function getSessionIdentity(session: Session): SessionIdentity {
  const user = session.user;
  const authProvider = (user as { authProvider?: string }).authProvider;
  const authUserId = (user as { authUserId?: string }).authUserId;

  if (!user || !authProvider || !authUserId) {
    throw new Error("Authenticated session is missing provider identity.");
  }

  return {
    authProvider,
    authUserId,
    email: user.email ?? null,
    name: user.name ?? null,
    image: user.image ?? null,
  };
}

export async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/");
  }

  return session;
}

export async function getOrCreateUser(session: Session) {
  const identity = getSessionIdentity(session);

  return db.user.upsert({
    where: {
      authProvider_authUserId: {
        authProvider: identity.authProvider,
        authUserId: identity.authUserId,
      },
    },
    update: {
      email: identity.email,
      name: identity.name,
      image: identity.image,
    },
    create: identity,
  });
}
