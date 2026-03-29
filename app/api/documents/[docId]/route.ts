import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/authOptions";
import { checkDocumentAccessById } from "@/lib/document-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ docId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await params;
  const access = await checkDocumentAccessById(docId);

  if (!access.allowed || !access.document) {
    return NextResponse.json({ error: "Document unavailable" }, { status: 404 });
  }

  return NextResponse.json({
    id: access.document.id,
    automergeIdentifier: access.document.automergeIdentifier,
    title: access.document.title,
    visibility: access.document.visibility,
    role: access.role === "link" ? "member" : access.role,
  });
}
