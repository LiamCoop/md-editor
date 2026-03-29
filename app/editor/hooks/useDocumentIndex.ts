import { useDocument, useRepo } from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import { useEffect, useState } from "react";
import type { DocumentIndexDoc } from "@/lib/types";

export function useDocumentIndex({
    userId,
    docUrl,
}: {
    userId: string;
    docUrl: AutomergeUrl;
}) {
    const repo = useRepo();
    const indexStorageKey = `md-editor:index-url:${userId}`;
    const [indexUrl] = useState<AutomergeUrl | undefined>(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        const existingIndexUrl = window.localStorage.getItem(indexStorageKey) as
            | AutomergeUrl
            | null;
        if (existingIndexUrl) {
            return existingIndexUrl;
        }

        const handle = repo.create<DocumentIndexDoc>({ documents: [] });
        window.localStorage.setItem(indexStorageKey, handle.url);
        return handle.url;
    });

    const [indexDoc, changeIndexDoc] = useDocument<DocumentIndexDoc>(indexUrl, {
        suspense: false,
    });

    useEffect(() => {
        if (!indexDoc || !docUrl) {
            return;
        }
        const alreadyTracked = indexDoc.documents.some((entry) => entry.url === docUrl);
        if (alreadyTracked) {
            return;
        }
        changeIndexDoc((doc) => {
            doc.documents.push({
                url: docUrl,
                createdAt: Date.now(),
                createdBy: userId,
            });
        });
    }, [docUrl, changeIndexDoc, indexDoc, userId]);

    return { indexDoc, changeIndexDoc };
}
