"use client";

import { buildTranscript, localDate, type TranscriptInput } from "@app/lib/transcript";

// Saves the transcript as a Markdown file through a Blob and an object URL. Nothing is sent to
// the server, so it works after any failure, including when input is disabled.
export function DownloadTranscript({
  input,
  disabled,
}: {
  input: Omit<TranscriptInput, "date">;
  disabled: boolean;
}) {
  const download = () => {
    const date = new Date();
    const blob = new Blob([buildTranscript({ ...input, date })], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `step-up-transcript-${localDate(date)}.md`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={download}
      className="shrink-0 rounded-lg border border-teal bg-card px-3 py-1.5 text-sm font-medium text-teal hover:bg-teal-soft disabled:opacity-50"
    >
      Download transcript
    </button>
  );
}
