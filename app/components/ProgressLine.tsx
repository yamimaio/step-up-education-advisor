import type { ProgressStep } from "@app/lib/progress";

// Your goal · Your needs · Your situation · Verdict. Done steps carry a check and the words
// "done" for screen readers; the current step is bold and marked aria-current, so neither state
// rests on color alone.
export function ProgressLine({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol
      aria-label="Progress"
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs sm:gap-x-2 sm:text-sm"
    >
      {steps.map((step, i) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className="flex items-center gap-1.5 sm:gap-2"
        >
          {i > 0 && (
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
          )}
          <span
            className={
              step.state === "done"
                ? "flex items-center gap-1 text-teal"
                : step.state === "current"
                  ? "font-semibold text-ink underline decoration-teal decoration-2 underline-offset-4"
                  : "text-muted"
            }
          >
            {step.state === "done" && <Check />}
            {step.label}
            {step.state === "done" && <span className="sr-only"> (done)</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="size-3.5">
      <path
        d="M3 8.5l3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
