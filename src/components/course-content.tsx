import * as React from "react";

/**
 * Renders the course text WITHOUT any HTML: plain React elements only, so nothing an admin pastes
 * can run as script. Supported: blank-line separated paragraphs, "# / ## / ###" headings and
 * "- " or "* " bullet lists. Anything else is shown as plain text.
 */
export function CourseContent({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-4 leading-relaxed [overflow-wrap:anywhere]">
      {blocks.map((block, i) => {
        const heading = /^(#{1,3})\s+(.+)$/.exec(block);
        if (heading && !block.includes("\n")) {
          const level = heading[1].length;
          const cls = level === 1 ? "text-xl font-semibold" : level === 2 ? "text-lg font-semibold" : "text-base font-semibold";
          return React.createElement(level === 1 ? "h2" : level === 2 ? "h3" : "h4", { key: i, className: cls }, heading[2]);
        }
        const lines = block.split("\n");
        if (lines.every((l) => /^[-*]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^[-*]\s+/, "")}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}
