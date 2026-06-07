import { describe, it, expect } from "vitest";
import { playerState } from "../PlayerState";

describe("Player State", () => {
  it("consumes action once", () => {
    playerState.setActionPressed(true);

    expect(playerState.consumeAction()).toBe(true);
    expect(playerState.consumeAction()).toBe(false);
  });

  it("returns false when no action", () => {
    playerState.setActionPressed(false);

    expect(playerState.consumeAction()).toBe(false);
  });
});