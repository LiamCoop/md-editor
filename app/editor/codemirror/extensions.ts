import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";

export const setCommentHighlightsEffect = StateEffect.define<
    readonly { from: number; to: number; focused?: boolean }[]
>();

export const setCollaboratorPresenceEffect = StateEffect.define<
    readonly {
        from: number;
        to: number;
        cursor: number;
        color: string;
        userId: string;
        displayName: string;
    }[]
>();

export const commentHighlightsField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(decorations, transaction) {
        let next = decorations.map(transaction.changes);
        for (const effect of transaction.effects) {
            if (!effect.is(setCommentHighlightsEffect)) {
                continue;
            }
            const sortedRanges = [...effect.value]
                .filter((range) => range.to > range.from)
                .sort((a, b) => a.from - b.from || a.to - b.to);
            const decorationsSet = sortedRanges.map((range) =>
                Decoration.mark({
                    class: range.focused
                        ? "cm-comment-highlight cm-comment-highlight-active"
                        : "cm-comment-highlight",
                }).range(range.from, range.to),
            );
            next = Decoration.set(decorationsSet, true);
        }
        return next;
    },
    provide: (field) => EditorView.decorations.from(field),
});

export class RemoteCursorWidget extends WidgetType {
    constructor(
        private readonly color: string,
        private readonly userId: string,
        private readonly displayName: string,
    ) {
        super();
    }

    toDOM(): HTMLElement {
        const cursor = document.createElement("span");
        cursor.style.display = "inline-block";
        cursor.style.width = "2px";
        cursor.style.height = "1.2em";
        cursor.style.marginLeft = "-1px";
        cursor.style.verticalAlign = "text-bottom";
        cursor.style.backgroundColor = this.color;
        cursor.style.pointerEvents = "auto";
        cursor.style.cursor = "pointer";
        cursor.className = "cm-remote-cursor";
        cursor.dataset.userId = this.userId;
        cursor.dataset.displayName = this.displayName;
        cursor.dataset.color = this.color;
        return cursor;
    }
}

export const collaboratorPresenceField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(decorations, transaction) {
        let next = decorations.map(transaction.changes);
        for (const effect of transaction.effects) {
            if (!effect.is(setCollaboratorPresenceEffect)) {
                continue;
            }

            const ranges: ReturnType<Decoration["range"]>[] = [];
            for (const range of effect.value) {
                if (range.to > range.from) {
                    ranges.push(
                        Decoration.mark({
                            class: "cm-remote-selection",
                            attributes: {
                                "data-user-id": range.userId,
                                "data-display-name": range.displayName,
                                "data-color": range.color,
                                style: `background-color: ${range.color}33;`,
                            },
                        }).range(range.from, range.to),
                    );
                }

                ranges.push(
                    Decoration.widget({
                        widget: new RemoteCursorWidget(
                            range.color,
                            range.userId,
                            range.displayName,
                        ),
                        side: 1,
                    }).range(range.cursor),
                );
            }
            next = Decoration.set(ranges, true);
        }
        return next;
    },
    provide: (field) => EditorView.decorations.from(field),
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
    },
    ".cm-comment-highlight-active": {
        backgroundColor: "#f2d67a",
    },
});
