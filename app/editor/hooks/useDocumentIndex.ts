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
    const [indexUrl, setIndexUrl] = useState<AutomergeUrl | undefined>(undefined);

    useEffect(() => {
        const existingIndexUrl = window.localStorage.getItem(indexStorageKey) as
            | AutomergeUrl
            | null;
        if (existingIndexUrl) {
            setIndexUrl(existingIndexUrl);
            return;
        }
        const handle = repo.create<DocumentIndexDoc>({ documents: [] });
        window.localStorage.setItem(indexStorageKey, handle.url);
        setIndexUrl(handle.url);
    }, [indexStorageKey, repo]);

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
