import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/authOptions";
import { DocumentLibrary } from "./DocumentLibrary";

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (!session?.user) {
    redirect("/");
  }

  if (params.doc) {
    redirect(`/editor/${encodeURIComponent(params.doc)}`);
  }

  const userId =
    (session.user as { azureId?: string }).azureId ??
    session.user.email ??
    "unknown-user";

  return (
    <DocumentLibrary
      user={{
        id: userId,
        name: session.user.name ?? "Unknown User",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
    />
  );
}
