import type { MessageParam } from "@app/lib/chatTypes";

// Small page-side histories: an ask_choice call and the user's answer, as the page holds them.

export const ask = (field: string, question: string, id = `ask_${field}`): MessageParam => ({
  role: "assistant",
  content: [{ type: "tool_use", id, name: "ask_choice", input: { field, question } }],
});

export const tap = (
  id: string,
  chosen: (string | { label: string; value: unknown })[],
  typed?: string,
): MessageParam => ({
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: id,
      content: JSON.stringify(typed === undefined ? { chosen } : { chosen, typed }),
    },
  ],
});

// A chip field asked and answered with these labels (or typed words).
export const answered = (field: string, chosen: string[], typed?: string): MessageParam[] => [
  ask(field, `The ${field} question`),
  tap(`ask_${field}`, chosen, typed),
];
