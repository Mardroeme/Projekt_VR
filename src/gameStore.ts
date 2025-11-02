import { create } from "zustand"

type GameState = {
  startedAt?: number
  finishedAt?: number
  puzzlesSolved: number
  puzzlesTotal: number
  start: () => void
  solvePuzzle: () => void
  finish: () => void
  reset: () => void
}

export const useGame = create<GameState>((set, get) => ({
  startedAt: undefined,
  finishedAt: undefined,
  puzzlesSolved: 0,
  puzzlesTotal: 3,
  start: () => set({ startedAt: Date.now(), finishedAt: undefined, puzzlesSolved: 0 }),
  solvePuzzle: () => {
    const { puzzlesSolved, puzzlesTotal } = get()
    if (puzzlesSolved < puzzlesTotal) set({ puzzlesSolved: puzzlesSolved + 1 })
  },
  finish: () => set({ finishedAt: Date.now() }),
  reset: () => set({ startedAt: undefined, finishedAt: undefined, puzzlesSolved: 0 })
}))
