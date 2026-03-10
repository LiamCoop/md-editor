"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import { MermaidBlock } from "./MermaidBlock";

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeHighlight, rehypeKatex];

const components: Components = {
    code({ className, children, ...props }) {
        const match = /language-mermaid/.exec(className || "");
        if (match) {
            return <MermaidBlock chart={String(children).trim()} />;
        }
        return (
            <code className={className} {...props}>
                {children}
            </code>
        );
    },
};

export const MarkdownPreview = memo(function MarkdownPreview({ content, className }: { content: string; className?: string }) {
    return (
        <div className={`prose prose-neutral max-w-none overflow-y-auto rounded-lg border border-black/15 bg-white p-6 ${className ?? ""}`}>
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
});
