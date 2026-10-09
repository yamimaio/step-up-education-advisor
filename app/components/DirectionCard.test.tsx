// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { personaADirection } from "../../tests/fixtures/directions";
import { DirectionCard } from "./DirectionCard";

afterEach(cleanup);

const renderCard = (direction = personaADirection) => {
  const onConfirm = vi.fn();
  const onCorrect = vi.fn();
  render(
    <DirectionCard
      direction={direction}
      disabled={false}
      onConfirm={onConfirm}
      onCorrect={onCorrect}
    />,
  );
  return { onConfirm, onCorrect, user: userEvent.setup() };
};

describe("DirectionCard", () => {
  it("lists each line with chip labels and the goal in the user's words", () => {
    renderCard();
    const card = screen.getByRole("region", { name: "Here's what I understood" });
    const text = card.textContent ?? "";
    expect(text).toContain('Step up to a bigger leadership role: "Move into an executive role"');
    expect(text).toContain(
      "1. A senior network, 2. Leadership skills, 3. Deep expertise in a field",
    );
    expect(text).toContain("More senior leaders");
    expect(text).toContain("Up to a year");
    expect(text).toContain("5 to 10");
    expect(text).toContain("Yes, I keep working");
    expect(text).toContain("Not needed");
  });

  it("shows a declined field as Not answered", () => {
    renderCard({ ...personaADirection, peerPreference: null, declined: ["peerPreference"] });
    expect(screen.getByText("Not answered")).toBeTruthy();
  });

  it("sends confirm on Looks right", async () => {
    const { onConfirm, user } = renderCard();
    await user.click(screen.getByRole("button", { name: "Looks right" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("opens corrections on Change something and sends the user's words", async () => {
    const { onConfirm, onCorrect, user } = renderCard();
    await user.click(screen.getByRole("button", { name: "Change something" }));
    await user.type(screen.getByLabelText("What should change?"), "Up to 2 years is fine");
    await user.click(screen.getByRole("button", { name: "Send changes" }));
    expect(onCorrect).toHaveBeenCalledWith("Up to 2 years is fine");
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
