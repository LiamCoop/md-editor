import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { authOptions } from "@/app/api/auth/authOptions";
import { listDocumentMembers } from "../actions";
import { EditorShell } from "../EditorShell";

async function getDocumentFromApi(docId: string) {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

    if (!host) {
        throw new Error("Missing host header.");
    }

    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
    const cookie = requestHeaders.get("cookie") ?? "";
    const response = await fetch(
        `${protocol}://${host}/api/documents/${encodeURIComponent(docId)}`,
        {
            cache: "no-store",
            headers: {
                cookie,
            },
        },
    );

    if (!response.ok) {
        return null;
    }

    return response.json() as Promise<{
        id: string;
        automergeIdentifier: string;
        visibility: "PRIVATE" | "LINK";
        role: "owner" | "member";
    }>;
}

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

    if (!docId) {
        notFound();
    }

    const userId =
        (session.user as { authUserId?: string }).authUserId ??
        session.user.email ??
        "unknown-user";
    const document = await getDocumentFromApi(docId);

    if (!document) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
                <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-6 shadow-[0_12px_28px_rgba(0,0,0,0.08)]">
                    <h1 className="text-xl font-semibold">Document unavailable</h1>
                    <p className="mt-2 text-sm text-black/60">
                        This document was not found, or you do not have access to it.
                    </p>
                </div>
            </main>
        );
    }

    const members =
        document.role === "owner"
            ? await listDocumentMembers(document.id)
            : [];


    return (
        <Suspense fallback={null}>
            <EditorShell
                document={{
                    id: document.id,
                    visibility: document.visibility,
                    role: document.role,
                    members,
                }}
                docUrl={document.automergeIdentifier as AutomergeUrl}
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
