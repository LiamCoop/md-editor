import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { authOptions } from "@/app/api/auth/authOptions";
import { EditorShell } from "../EditorShell";

export default async function DocumentEditorPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { docId } = await params;

  if (!session?.user) {
    redirect("/");
  }

  let decodedDocUrl = "";
  try {
    decodedDocUrl = decodeURIComponent(docId);
  } catch {
    notFound();
  }

  if (!decodedDocUrl) {
    notFound();
  }

  const userId =
    (session.user as { azureId?: string }).azureId ??
    session.user.email ??
    "unknown-user";

  return (
    <Suspense fallback={null}>
      <EditorShell
        docUrl={decodedDocUrl as AutomergeUrl}
        user={{
          id: userId,
          name: session.user.name ?? "Unknown User",
          email: session.user.email ?? "",
          image: session.user.image ?? null,
        }}
      />
    </Suspense>
  );
}
