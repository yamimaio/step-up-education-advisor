// The Step Up mark: a rounded teal square with a white step line. Decorative: the name beside it
// is the heading.
export function StepUpMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false" className={className}>
      <rect width="40" height="40" rx="10" className="fill-teal" />
      <path
        d="M9 29h7v-7h7v-7h8"
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
