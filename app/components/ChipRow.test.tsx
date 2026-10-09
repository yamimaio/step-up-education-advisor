// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CHIPS } from "@core/advisor/chips";
import type { PendingChips } from "@app/lib/chatTypes";
import { ChipRow } from "./ChipRow";

afterEach(cleanup);

const months: PendingChips = {
  toolUseId: "toolu_01",
  field: "maxProgramMonths",
  question: "The longest program you'd take on now",
  options: CHIPS.maxProgramMonths.map((c) => ({ ...c })),
  pick: 1,
};

const needs: PendingChips = {
  toolUseId: "toolu_02",
  field: "needs",
  question: "What's missing",
  options: CHIPS.needs.map((c) => ({ ...c })),
  pick: 3,
};

describe("ChipRow", () => {
  it("shows each chip as a button with its label as visible text, grouped by the question", () => {
    render(<ChipRow chips={months} disabled={false} onSend={() => {}} />);
    const group = screen.getByRole("group", { name: months.question });
    expect(group).toBeTruthy();
    for (const { label } of CHIPS.maxProgramMonths) {
      expect(screen.getByRole("button", { name: label }).textContent).toBe(label);
    }
  });

  it("reaches the chips with Tab and sends the label (never the value) on Enter", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChipRow chips={months} disabled={false} onSend={onSend} />);
    await user.tab();
    await user.tab();
    expect(document.activeElement?.textContent).toBe("Up to 6 months");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith(["Up to 6 months"]);
  });

  it("collects a multi-select in tap order and sends it only when the count is reached", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChipRow chips={needs} disabled={false} onSend={onSend} />);
    const send = () => screen.getByRole("button", { name: /^Send/ }) as HTMLButtonElement;
    await user.click(screen.getByRole("button", { name: "A senior network" }));
    await user.click(screen.getByRole("button", { name: "Leadership skills" }));
    expect(send().disabled).toBe(true);
    // A second tap removes a choice.
    await user.click(screen.getByRole("button", { name: "Leadership skills" }));
    await user.click(screen.getByRole("button", { name: "Leadership skills" }));
    await user.click(screen.getByRole("button", { name: "Deep expertise in a field" }));
    expect(onSend).not.toHaveBeenCalled();
    await user.click(send());
    expect(onSend).toHaveBeenCalledWith([
      "A senior network",
      "Leadership skills",
      "Deep expertise in a field",
    ]);
  });

  it("sends nothing while disabled", async () => {
    const onSend = vi.fn();
    render(<ChipRow chips={months} disabled onSend={onSend} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Up to a year" }));
    expect(onSend).not.toHaveBeenCalled();
  });
});
