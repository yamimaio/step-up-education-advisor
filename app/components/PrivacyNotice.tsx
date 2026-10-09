// Shown before the first message (implementation plan section 6).
export function PrivacyNotice() {
  return (
    <aside className="rounded-lg bg-teal/10 p-3 text-sm">
      <p>
        What you write here is sent to an AI model provider (Anthropic) to run the conversation.
        Please don&apos;t share names, employers or contact details. Step Up keeps the conversation
        only in this page: it&apos;s gone when you close it, unless you download the transcript.
      </p>
    </aside>
  );
}
