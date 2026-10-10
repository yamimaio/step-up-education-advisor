// From message 30 the server sends how many messages are left before the cap.
export function MessageCounter({ remaining }: { remaining: number }) {
  return (
    <p role="status" className="text-xs text-muted">
      {remaining === 1 ? "1 message left" : `${remaining} messages left`} in this conversation.
    </p>
  );
}
