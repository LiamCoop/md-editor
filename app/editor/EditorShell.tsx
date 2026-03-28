"use client";

import { useDocument } from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import { useState } from "react";
import type { MarkdownDoc } from "@/lib/types";
import type { ViewMode } from "./utils";
import { EditorHeader } from "./EditorHeader";
import { MarkdownPreview } from "./MarkdownPreview";
import { useDocumentIndex } from "./hooks/useDocumentIndex";
import { useCodeMirrorEditor } from "./hooks/useCodeMirrorEditor";


interface EditorShellProps {
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    docUrl: AutomergeUrl;
}

export function EditorShell({ user, docUrl }: EditorShellProps) {
    useDocumentIndex({ userId: user.id, docUrl });

    const [activeDoc, changeActiveDoc] = useDocument<MarkdownDoc>(docUrl, {
        suspense: true,
    });

    const activeDocContent = activeDoc?.content ?? "";

    const [viewMode, setViewMode] = useState<ViewMode>("edit");

    const { editorHostRef, headerCollaborators } =
        useCodeMirrorEditor({ docUrl, user, activeDoc });

    if (!activeDoc) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="w-full border-b border-black/10 bg-background px-6 py-4">
                <EditorHeader
                    title={activeDoc.title}
                    onTitleChange={(nextTitle) =>
                        changeActiveDoc((doc) => {
                            doc.title = nextTitle;
                        })
                    }
                    user={user}
                    collaborators={headerCollaborators}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />
            </div>

            <div className={`mx-auto w-full px-6 pt-4 ${viewMode === "split" ? "max-w-450" : "max-w-330"}`}>
                <div className={`flex gap-3 pb-12 ${viewMode === "split" ? "h-[calc(100vh-6rem)] items-stretch" : "items-start"}`}>
                    <div className={`relative min-w-0 ${viewMode === "preview" ? "hidden" : ""} ${viewMode === "split" ? "w-1/2 overflow-y-auto" : "w-full"}`}>
                        <div
                            ref={editorHostRef}
                            className={`relative w-full rounded-lg border border-black/15 bg-white ${viewMode === "split" ? "h-full overflow-y-auto" : ""}`}
                        />
                    </div>

                    {viewMode !== "edit" ? (
                        <div className={viewMode === "preview" ? "w-full" : "w-1/2 min-w-0 h-full"}>
                            <MarkdownPreview content={activeDocContent} className={viewMode === "split" ? "h-full overflow-y-auto" : ""} />
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
