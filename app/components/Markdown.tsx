import ReactMarkdown, { type Components } from "react-markdown";

// The small markdown subset the advisor writes: paragraphs, bullet and numbered lists, bold and
// italic. Anything else (headings, links, tables, images, code) is unwrapped to its plain text.
// Raw HTML in model text is skipped, never rendered.
const ALLOWED = ["p", "strong", "em", "ul", "ol", "li"];

// Tailwind's reset strips list markers and spacing, so the lists put them back.
const components: Components = {
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children, start }) => (
    <ol start={start} className="list-decimal space-y-1 pl-5">
      {children}
    </ol>
  ),
};

export function Markdown({ text }: { text: string }) {
  // whitespace-normal: the bubble keeps the user's line breaks with pre-wrap, but here the
  // newlines between rendered elements would show as blank lines.
  return (
    <div className="space-y-2 whitespace-normal">
      <ReactMarkdown allowedElements={ALLOWED} unwrapDisallowed skipHtml components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
