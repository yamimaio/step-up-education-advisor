// The four tools the advisor can call (implementation plan section 5). Shared with the server
// in step 6, so advisor.md and the tool definitions can't drift apart.
export const ADVISOR_TOOL_NAMES = [
  "ask_choice",
  "check_contradictions",
  "propose_profile",
  "search_programs",
] as const;

export type AdvisorToolName = (typeof ADVISOR_TOOL_NAMES)[number];
