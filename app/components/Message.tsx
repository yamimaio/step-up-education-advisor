import type { Turn } from "@app/lib/conversation";
import { turnText } from "@app/lib/conversation";

// One chat bubble: the advisor on the left, the user (typed, tapped or card answer) on the right.
export function Message({ turn }: { turn: Turn }) {
  const mine = turn.kind !== "assistant";
  return (
    <li className={mine ? "flex justify-end" : "flex justify-start"}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 ${
          mine ? "bg-teal text-paper" : "bg-white text-ink shadow-sm"
        }`}
      >
        <span className="sr-only">{mine ? "You: " : "Step Up: "}</span>
        {turnText(turn)}
      </p>
    </li>
  );
}
