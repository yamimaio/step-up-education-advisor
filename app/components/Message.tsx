import type { Turn } from "@app/lib/conversation";
import { turnText } from "@app/lib/conversation";
import { Markdown } from "./Markdown";

// One chat bubble: the advisor on the left, the user (typed, tapped or card answer) on the right.
// Only the advisor's text is read as markdown; the user's words show exactly as typed.
export function Message({ turn }: { turn: Turn }) {
  const mine = turn.kind !== "assistant";
  return (
    <li className={mine ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 ${
          mine ? "bg-teal text-paper" : "bg-white text-ink shadow-sm"
        }`}
      >
        <span className="sr-only">{mine ? "You: " : "Step Up: "}</span>
        {mine ? turnText(turn) : <Markdown text={turnText(turn)} />}
      </div>
    </li>
  );
}
