"use client";

import { useId, useState } from "react";
import type { PendingChips } from "@app/lib/chatTypes";

// Quick-reply chips: real buttons with text labels, grouped and named by the question. A single
// choice sends on tap; a multi-select (needs: 3) numbers the taps in order and sends with Send.
export function ChipRow({
  chips,
  disabled,
  onSend,
}: {
  chips: PendingChips;
  disabled: boolean;
  onSend: (chosen: string[]) => void;
}) {
  const questionId = useId();
  const [picked, setPicked] = useState<string[]>([]);
  const multi = chips.pick > 1;

  const tap = (label: string) => {
    if (!multi) return onSend([label]);
    setPicked((p) =>
      p.includes(label) ? p.filter((l) => l !== label) : p.length < chips.pick ? [...p, label] : p,
    );
  };

  return (
    <div role="group" aria-labelledby={questionId} className="flex flex-col gap-2">
      <p id={questionId} className="text-sm font-medium">
        {chips.question}
        {multi && <span className="font-normal"> (pick {chips.pick}, most important first)</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.options.map(({ label }) => {
          const order = picked.indexOf(label);
          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              aria-pressed={multi ? order >= 0 : undefined}
              onClick={() => tap(label)}
              className="rounded-full border border-teal px-3 py-1.5 text-sm text-teal hover:bg-teal/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-50 aria-pressed:bg-teal aria-pressed:text-paper"
            >
              {order >= 0 && <span aria-hidden="true">{order + 1}. </span>}
              {label}
              {/* The rank is part of the name, so a screen reader hears the order picked. */}
              {order >= 0 && <span className="sr-only">, ranked {order + 1}</span>}
            </button>
          );
        })}
      </div>
      {multi && (
        <button
          type="button"
          disabled={disabled || picked.length !== chips.pick}
          onClick={() => onSend(picked)}
          className="self-start rounded bg-teal px-4 py-1.5 text-sm text-paper disabled:opacity-50"
        >
          Send {picked.length} of {chips.pick}
        </button>
      )}
    </div>
  );
}
