import type { ReactNode } from "react";

// A show-more section with one summary style: teal, with a chevron that turns when open. The
// summary keeps the global focus ring. Used by the verdict's "How each type compares" and the
// program card's "Sources".
export function Disclosure({
  summary,
  className = "",
  children,
}: {
  summary: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details className={`group ${className}`}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium text-teal [&::-webkit-details-marker]:hidden">
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
          className="size-3.5 transition-transform group-open:rotate-90"
        >
          <path
            d="M6 3.5l4.5 4.5L6 12.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {summary}
      </summary>
      {children}
    </details>
  );
}
