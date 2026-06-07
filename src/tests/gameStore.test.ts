import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "../gameStore";

describe("Game Store", () => {
  beforeEach(() => {
    useGame.getState().reset();
  });

  it("starts game correctly", () => {
    useGame.getState().start();

    const state = useGame.getState();

    expect(state.startedAt).toBeDefined();
    expect(state.finishedAt).toBeUndefined();
    expect(state.puzzlesSolved).toBe(0);
  });

  it("solves puzzle", () => {
    useGame.getState().solvePuzzle();

    expect(useGame.getState().puzzlesSolved).toBe(1);
  });

  it("does not exceed puzzle limit", () => {
    const game = useGame.getState();

    game.solvePuzzle();
    game.solvePuzzle();
    game.solvePuzzle();
    game.solvePuzzle();
    game.solvePuzzle();

    expect(useGame.getState().puzzlesSolved).toBe(3);
  });

  it("finishes game", () => {
    useGame.getState().finish();

    expect(useGame.getState().finishedAt).toBeDefined();
  });

  it("resets game", () => {
    const game = useGame.getState();

    game.start();
    game.solvePuzzle();
    game.finish();
    game.reset();

    const state = useGame.getState();

    expect(state.startedAt).toBeUndefined();
    expect(state.finishedAt).toBeUndefined();
    expect(state.puzzlesSolved).toBe(0);
  });
});