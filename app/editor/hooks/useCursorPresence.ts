import {
    useDocHandle,
    usePresence,
} from "@automerge/automerge-repo-react-hooks";
import type { AutomergeUrl } from "@automerge/automerge-repo/slim";
import { useCallback, useMemo, useRef } from "react";
import type { MarkdownDoc } from "@/lib/types";

const COLLABORATOR_COLORS = [
    "#E06C75",
    "#61AFEF",
    "#C678DD",
    "#E5C07B",
    "#56B6C2",
    "#98C379",
    "#D19A66",
    "#BE5046",
];

interface CursorPresenceData {
    userId: string;
    displayName: string;
    image: string | null;
    cursor: { head: string; anchor: string } | null;
}

export interface Collaborator {
    userId: string;
    displayName: string;
    color: string;
    image: string | null;
}

export interface PeerCursorInfo {
    userId: string;
    displayName: string;
    color: string;
    cursor: { head: string; anchor: string } | null;
}

function throttle<T extends (...args: Parameters<T>) => void>(
    fn: T,
    ms: number,
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        const now = Date.now();
        const remaining = ms - (now - lastCall);
        if (timer) clearTimeout(timer);
        if (remaining <= 0) {
            lastCall = now;
            fn(...args);
        } else {
            timer = setTimeout(() => {
                lastCall = Date.now();
                fn(...args);
            }, remaining);
        }
    };
}

export function useCursorPresence({
    docUrl,
    user,
}: {
    docUrl: AutomergeUrl;
    user: { id: string; name: string; image: string | null };
}) {
    const handle = useDocHandle<MarkdownDoc>(docUrl, { suspense: true });

    const { peerStates, update } = usePresence<CursorPresenceData>({
        handle: handle!,
        initialState: {
            userId: user.id,
            displayName: user.name,
            image: user.image,
            cursor: null,
        },
    });

    const updateRef = useRef(update);
    updateRef.current = update;

    const broadcastCursor = useMemo(
        () =>
            throttle((head: string, anchor: string) => {
                updateRef.current("cursor", { head, anchor });
            }, 50),
        [],
    );

    const { collaborators, peerCursorData } = useMemo(() => {
        const peerEntries = peerStates.getStates({
            groupingFn: (peer) => peer.value.userId,
            summaryFn: (peers) => peers[0].value,
        });

        const peers = Object.values(peerEntries).filter(
            (p) => p.userId !== user.id,
        );

        const self: Collaborator = {
            userId: user.id,
            displayName: user.name,
            color: COLLABORATOR_COLORS[0],
            image: user.image,
        };

        const peerCollaborators: Collaborator[] = peers.map((p, i) => ({
            userId: p.userId,
            displayName: p.displayName,
            color: COLLABORATOR_COLORS[(i + 1) % COLLABORATOR_COLORS.length],
            image: p.image,
        }));

        const peerCursors: PeerCursorInfo[] = peers.map((p, i) => ({
            userId: p.userId,
            displayName: p.displayName,
            color: COLLABORATOR_COLORS[(i + 1) % COLLABORATOR_COLORS.length],
            cursor: p.cursor,
        }));

        return {
            collaborators: [self, ...peerCollaborators],
            peerCursorData: peerCursors,
        };
    }, [peerStates, user.id, user.name, user.image]);

    return { collaborators, peerCursorData, broadcastCursor };
}
