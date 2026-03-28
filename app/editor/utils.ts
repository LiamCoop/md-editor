export type ViewMode = "edit" | "split" | "preview";

export interface PendingComment {
    anchorStartCursor: string;
    anchorEndCursor: string;
    selectedText: string;
    body: string;
}

export interface FloatingCommentButtonPosition {
    top: number;
    left: number;
}

export interface AnchoredCommentPosition {
    top: number;
}

export function areFloatingPositionsEqual(
    a: FloatingCommentButtonPosition | null,
    b: FloatingCommentButtonPosition | null,
): boolean {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return a.top === b.top && a.left === b.left;
}

export function areAnchoredPositionsEqual(
    a: Record<string, AnchoredCommentPosition>,
    b: Record<string, AnchoredCommentPosition>,
): boolean {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
        return false;
    }
    for (const key of aKeys) {
        if (!b[key] || a[key].top !== b[key].top) {
            return false;
        }
    }
    return true;
}

export function avatarFallback(name: string, email: string): string {
    const source = name.trim() || email.trim() || "U";
    return source.slice(0, 1).toUpperCase();
}

export function formatCommentDate(timestamp: number): string {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(timestamp));
}
