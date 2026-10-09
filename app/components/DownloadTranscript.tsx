"use client";

import { buildTranscript, type TranscriptInput } from "@app/lib/transcript";

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
    a.download = `step-up-transcript-${date.toISOString().slice(0, 10)}.md`;
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
      className="rounded border border-teal px-3 py-1.5 text-sm text-teal disabled:opacity-50"
    >
      Download transcript
    </button>
  );
}
