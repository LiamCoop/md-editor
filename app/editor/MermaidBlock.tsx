"use client";

import { memo, useEffect, useId, useRef } from "react";
import mermaid from "mermaid";

let mermaidInitialized = false;
if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, theme: "neutral" });
    mermaidInitialized = true;
}

export const MermaidBlock = memo(function MermaidBlock({ chart }: { chart: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const id = `mermaid-${useId().replace(/:/g, "")}`;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!containerRef.current) return;
            try {
                const { svg } = await mermaid.render(id, chart);
                if (!cancelled && containerRef.current) {
                    containerRef.current.innerHTML = svg;
                }
            } catch {
                // Mermaid appends an error element to the body on failed renders — remove it
                document.getElementById(id)?.remove();
                if (!cancelled && containerRef.current) {
                    containerRef.current.innerHTML = `<pre class="text-red-600 text-sm whitespace-pre-wrap border border-red-300 rounded p-3 bg-red-50">${chart}</pre>`;
                }
            }
        })();
        return () => { cancelled = true; };
    }, [chart, id]);

    return <div ref={containerRef} className="my-4 flex justify-center" />;
});
