import {
    EditorView,
    Decoration,
    WidgetType,
    type DecorationSet,
} from "@codemirror/view";
import { StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";

export interface RemoteCursor {
    head: number;
    anchor: number;
    displayName: string;
    color: string;
}

export const setRemoteCursors = StateEffect.define<RemoteCursor[]>();

class CursorWidget extends WidgetType {
    constructor(
        readonly color: string,
        readonly name: string,
    ) {
        super();
    }

    toDOM() {
        const wrapper = document.createElement("span");
        wrapper.className = "cm-remote-cursor";
        wrapper.style.borderLeftColor = this.color;

        const label = document.createElement("span");
        label.className = "cm-remote-cursor-label";
        label.style.backgroundColor = this.color;
        label.textContent = this.name;
        wrapper.appendChild(label);

        return wrapper;
    }

    eq(other: CursorWidget) {
        return this.color === other.color && this.name === other.name;
    }
}

function buildDecorations(cursors: RemoteCursor[]): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();

    // Collect all decorations with positions, then sort by from position
    const decorations: { from: number; to: number; decoration: Decoration }[] =
        [];

    for (const cursor of cursors) {
        // Cursor line widget
        decorations.push({
            from: cursor.head,
            to: cursor.head,
            decoration: Decoration.widget({
                widget: new CursorWidget(cursor.color, cursor.displayName),
                side: 1,
            }),
        });

        // Selection highlight
        if (cursor.anchor !== cursor.head) {
            const from = Math.min(cursor.anchor, cursor.head);
            const to = Math.max(cursor.anchor, cursor.head);
            decorations.push({
                from,
                to,
                decoration: Decoration.mark({
                    class: "cm-remote-selection",
                    attributes: {
                        style: `background-color: ${cursor.color}30`,
                    },
                }),
            });
        }
    }

    // RangeSetBuilder requires decorations sorted by from position
    decorations.sort((a, b) => a.from - b.from || a.to - b.to);

    for (const { from, to, decoration } of decorations) {
        builder.add(from, to, decoration);
    }

    return builder.finish();
}

const remoteCursorsField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(value, tr) {
        for (const effect of tr.effects) {
            if (effect.is(setRemoteCursors)) {
                return buildDecorations(effect.value);
            }
        }
        // Map positions through document changes
        if (tr.docChanged) {
            return value.map(tr.changes);
        }
        return value;
    },
    provide(field) {
        return EditorView.decorations.from(field);
    },
});

const remoteCursorsBaseTheme = EditorView.baseTheme({
    ".cm-remote-cursor": {
        position: "relative",
        borderLeft: "2px solid transparent",
        marginLeft: "-1px",
        marginRight: "-1px",
    },
    ".cm-remote-cursor-label": {
        position: "absolute",
        bottom: "100%",
        left: "-1px",
        padding: "1px 4px",
        borderRadius: "3px 3px 3px 0",
        fontSize: "10px",
        fontFamily: "sans-serif",
        color: "white",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        opacity: "1",
        transition: "opacity 2s ease 3s",
    },
});

export function remoteCursorsExtension() {
    return [remoteCursorsField, remoteCursorsBaseTheme];
}
