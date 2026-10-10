// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PendingConfirm } from "@app/lib/chatTypes";
import { confirmCard } from "@app/lib/labels";
import { personaADirection } from "../../tests/fixtures/directions";
import { NO_HOME, NO_HOME_DECLINED, personaAProfile } from "../../tests/fixtures/profiles";
import { ConfirmCard } from "./ConfirmCard";

afterEach(cleanup);

const renderCard = (
  confirm: PendingConfirm = { toolUseId: "t1", direction: personaADirection },
  correction: string | null = null,
) => {
  const onConfirm = vi.fn();
  const onCorrect = vi.fn();
  render(
    <ConfirmCard
      {...confirmCard(confirm)}
      correction={correction}
      disabled={false}
      onConfirm={onConfirm}
      onCorrect={onCorrect}
    />,
  );
  return { onConfirm, onCorrect, user: userEvent.setup() };
};

const searchCard = (profile = personaAProfile): PendingConfirm => ({ toolUseId: "t2", profile });

describe("ConfirmCard, stage 1 (propose_direction)", () => {
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
    renderCard({
      toolUseId: "t1",
      direction: { ...personaADirection, peerPreference: null, declined: ["peerPreference"] },
    });
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

  it("opens with a refused correction filled in, ready to rephrase", () => {
    renderCard(undefined, "Up to 2 years is fine");
    const box = screen.getByLabelText("What should change?") as HTMLTextAreaElement;
    expect(box.value).toBe("Up to 2 years is fine");
  });
});

describe("ConfirmCard, stage 2 (propose_search)", () => {
  it("lists the stage 2 answers with chip labels, and no stage 1 lines", () => {
    renderCard(searchCard());
    const card = screen.getByRole("region", { name: "Here's what I'll search with" });
    const text = card.textContent ?? "";
    expect(text).toContain("Tuition budget$40k to $80k");
    expect(text).toContain("How you'd payInstallments");
    expect(text).toContain("Travel budget$5k to $10k");
    expect(text).toContain("Typical airfare$1,000 to $1,500");
    expect(text).toContain("Traveling for itPart of the appeal");
    expect(text).toContain("FormatBlended");
    expect(text).toContain("On-site days a yearUp to 20");
    expect(text).toContain("Longest stretch awayAbout a week");
    expect(text).toContain("Where you liveBuenos Aires, C, AR");
    expect(text).toContain("RelocateNo, I would not");
    expect(text).toContain("A location should give youImmersion, Network density");
    expect(text).toContain("Experience16 years");
    expect(text).toContain("Highest degreeBachelor's in Engineering");
    expect(text).toContain("Current roleManager");
    expect(text).not.toContain("Move into an executive role");
    // The coordinates are the model's estimate for the engine, never shown.
    expect(text).not.toContain("-34.6");
  });

  it("shows a figure with no chip as typed, and declined fields as Not answered", () => {
    renderCard(
      searchCard({
        ...personaAProfile,
        tuitionBudgetUsd: 25000,
        ...NO_HOME,
        relocate: false,
        declined: [...NO_HOME_DECLINED, "relocate"],
      }),
    );
    const text = screen.getByRole("region").textContent ?? "";
    expect(text).toContain("Tuition budget$25,000");
    expect(text).toContain("Where you liveNot answered");
    expect(text).toContain("RelocateNot answered");
  });

  it("confirms and takes corrections like the stage 1 card", async () => {
    const { onConfirm, onCorrect, user } = renderCard(searchCard());
    await user.click(screen.getByRole("button", { name: "Looks right" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Change something" }));
    await user.type(screen.getByLabelText("What should change?"), "My budget is $30k");
    await user.click(screen.getByRole("button", { name: "Send changes" }));
    expect(onCorrect).toHaveBeenCalledWith("My budget is $30k");
  });
});
