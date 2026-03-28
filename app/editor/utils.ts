export type ViewMode = "edit" | "split" | "preview";

export function avatarFallback(name: string, email: string): string {
    const source = name.trim() || email.trim() || "U";
    return source.slice(0, 1).toUpperCase();
}
