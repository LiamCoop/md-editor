import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/authOptions";
import { EditorShell } from "./EditorShell";

export default async function EditorPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/");
  }

  const userId =
    (session.user as { azureId?: string }).azureId ??
    session.user.email ??
    "unknown-user";

  return (
    <EditorShell
      user={{
        id: userId,
        name: session.user.name ?? "Unknown User",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
    />
  );
}
