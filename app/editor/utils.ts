export type ViewMode = "edit" | "split" | "preview";

export interface PendingComment {
    anchorStart: number;
    anchorEnd: number;
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

export interface CollaboratorCursorPopover {
    name: string;
    color: string;
    top: number;
    left: number;
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

export const USER_COLORS = [
    "#d9480f",
    "#1d4ed8",
    "#047857",
    "#7c3aed",
    "#be123c",
    "#0f766e",
    "#b45309",
    "#4338ca",
];

export function getUserColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i += 1) {
        hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
    }
    return USER_COLORS[hash % USER_COLORS.length];
}

export function formatCommentDate(timestamp: number): string {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(timestamp));
}

export function toLineAndColumn(text: string, index: number): string {
    const clamped = Math.max(0, Math.min(index, text.length));
    const prefix = text.slice(0, clamped);
    const line = prefix.split("\n").length;
    const lastBreak = prefix.lastIndexOf("\n");
    const column = clamped - (lastBreak + 1) + 1;
    return `L${line}:C${column}`;
}
