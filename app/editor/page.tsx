import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/authOptions";
import { listMyDocuments, checkDocumentAccess } from "./actions";
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
    const access = await checkDocumentAccess(params.doc);
    if (!access.allowed || !access.document) {
      redirect("/editor");
    }
    redirect(`/editor/${encodeURIComponent(access.document.id)}`);
  }

  const userId =
    (session.user as { authUserId?: string }).authUserId ??
    session.user.email ??
    "unknown-user";
  const documents = await listMyDocuments();

  return (
    <DocumentLibrary
      documents={documents}
      user={{
        id: userId,
        name: session.user.name ?? "Unknown User",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
    />
  );
}
