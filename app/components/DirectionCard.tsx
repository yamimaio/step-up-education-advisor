"use client";

import { useId, useState } from "react";
import type { Direction } from "@core/advisor/tools";
import { directionLines } from "@app/lib/labels";

// The stage 1 confirm card. Each line comes from the propose_direction input through the chip
// labels; "Looks right" confirms, "Change something" asks what to change in the user's words.
export function DirectionCard({
  direction,
  disabled,
  onConfirm,
  onCorrect,
}: {
  direction: Direction;
  disabled: boolean;
  onConfirm: () => void;
  onCorrect: (corrections: string) => void;
}) {
  const headingId = useId();
  const [editing, setEditing] = useState(false);
  const [corrections, setCorrections] = useState("");

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-teal/40 bg-white/70 p-4 shadow-sm"
    >
      <h2 id={headingId} className="mb-3 font-semibold text-teal">
        Here&apos;s what I understood
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {directionLines(direction).map((line, i) => (
          <div key={i} className="contents">
            <dt className="text-ink/70">{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
      {editing ? (
        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (corrections.trim()) onCorrect(corrections.trim());
          }}
        >
          <label className="text-sm" htmlFor={`${headingId}-fix`}>
            What should change?
          </label>
          <textarea
            id={`${headingId}-fix`}
            value={corrections}
            maxLength={4000}
            rows={3}
            onChange={(e) => setCorrections(e.target.value)}
            className="rounded border border-ink/30 bg-white p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={disabled || !corrections.trim()}
              className="rounded bg-teal px-4 py-1.5 text-sm text-paper disabled:opacity-50"
            >
              Send changes
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-ink/30 px-4 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onConfirm}
            className="rounded bg-teal px-4 py-1.5 text-sm text-paper disabled:opacity-50"
          >
            Looks right
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing(true)}
            className="rounded border border-teal px-4 py-1.5 text-sm text-teal disabled:opacity-50"
          >
            Change something
          </button>
        </div>
      )}
    </section>
  );
}
