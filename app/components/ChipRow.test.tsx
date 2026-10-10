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
    const chip = (label: string) => screen.getByRole("button", { name: new RegExp(`^${label}`) });
    await user.click(chip("A senior network"));
    await user.click(chip("Leadership skills"));
    expect(send().disabled).toBe(true);
    // A second tap removes a choice.
    await user.click(chip("Leadership skills"));
    await user.click(chip("Leadership skills"));
    await user.click(chip("Deep expertise in a field"));
    expect(onSend).not.toHaveBeenCalled();
    // The rank is part of each picked chip's accessible name.
    expect(screen.getByRole("button", { name: "A senior network, ranked 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Leadership skills, ranked 2" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Deep expertise in a field, ranked 3" }),
    ).toBeTruthy();
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

describe("ChipRow, stage 2 chip sets", () => {
  const set = (field: "formatPreference" | "travelComfort" | "locationValues", pick = 1) => ({
    toolUseId: `toolu_${field}`,
    field,
    question: `Question for ${field}`,
    options: CHIPS[field].map((c) => ({ ...c })),
    pick,
  });

  it.each(["formatPreference", "travelComfort"] as const)(
    "shows %s as labelled buttons and sends the tapped label",
    async (field) => {
      const onSend = vi.fn();
      render(<ChipRow chips={set(field)} disabled={false} onSend={onSend} />);
      expect(screen.getByRole("group", { name: `Question for ${field}` })).toBeTruthy();
      for (const { label } of CHIPS[field]) {
        expect(screen.getByRole("button", { name: label }).textContent).toBe(label);
      }
      const first = CHIPS[field][0].label;
      await userEvent.setup().click(screen.getByRole("button", { name: first }));
      expect(onSend).toHaveBeenCalledWith([first]);
    },
  );

  it("takes two location values in order", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChipRow chips={set("locationValues", 2)} disabled={false} onSend={onSend} />);
    expect(screen.getByText("(pick 2, most important first)")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Immersion" }));
    await user.click(screen.getByRole("button", { name: "Network density" }));
    await user.click(screen.getByRole("button", { name: /^Send 2 of 2/ }));
    expect(onSend).toHaveBeenCalledWith(["Immersion", "Network density"]);
  });
});
