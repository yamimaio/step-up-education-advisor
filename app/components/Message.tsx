import type { Turn } from "@app/lib/conversation";
import { answerLine, turnText } from "@app/lib/conversation";
import { Markdown } from "./Markdown";

// One chat entry: the advisor's bubble on the left, the user's typed words (a typed reply to chips
// included) or card answer on the right, and a tapped chip answer as one small "question: answer"
// line. Only the advisor's text is read as markdown; the user's words show exactly as typed.
export function Message({ turn }: { turn: Turn }) {
  if (turn.kind === "chips" && turn.typed === undefined) {
    const line = answerLine(turn);
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] text-right text-sm whitespace-pre-wrap wrap-anywhere">
          <span className="sr-only">You: </span>
          <span className="text-muted">{line.label}:</span>{" "}
          <span className="font-medium text-ink">{line.value}</span>
        </p>
      </li>
    );
  }
  const mine = turn.kind !== "assistant";
  return (
    <li className={mine ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 whitespace-pre-wrap wrap-anywhere text-ink ${
          mine ? "bg-teal-soft" : "border border-line bg-card"
        }`}
      >
        <span className="sr-only">{mine ? "You: " : "Step Up: "}</span>
        {mine ? turnText(turn) : <Markdown text={turnText(turn)} />}
      </div>
    </li>
  );
}
