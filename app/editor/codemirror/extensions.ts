import { EditorView } from "@codemirror/view";

export const editorTheme = EditorView.theme({
    "&": {
        height: "auto",
    },
    "&.cm-editor": {
        outline: "none",
    },
    ".cm-scroller": {
        fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "0.875rem",
        overflow: "auto",
    },
    ".cm-content": {
        padding: "1rem",
        minHeight: "70vh",
    },
    ".cm-focused": {
        outline: "none",
    },
});
