import { EditorView, Decoration, type DecorationSet } from "@codemirror/view";
import { StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";

export interface CommentHighlight {
    from: number;
    to: number;
    focused: boolean;
}

export const setCommentHighlightsEffect = StateEffect.define<CommentHighlight[]>();

export const commentHighlightsField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(decorations, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(setCommentHighlightsEffect)) {
                const builder = new RangeSetBuilder<Decoration>();
                const sorted = [...effect.value].sort((a, b) => a.from - b.from);
                for (const highlight of sorted) {
                    if (highlight.to > highlight.from) {
                        builder.add(
                            highlight.from,
                            highlight.to,
                            Decoration.mark({
                                class: highlight.focused
                                    ? "cm-comment-highlight cm-comment-highlight-active"
                                    : "cm-comment-highlight",
                            }),
                        );
                    }
                }
                return builder.finish();
            }
        }
        return decorations.map(transaction.changes);
    },
    provide(field) {
        return EditorView.decorations.from(field);
    },
});

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
    ".cm-comment-highlight": {
        backgroundColor: "#f6e8b1",
        borderRadius: "2px",
    },
    ".cm-comment-highlight-active": {
        backgroundColor: "#f2d67a",
    },
});
