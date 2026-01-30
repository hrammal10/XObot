export const DIFFICULTY = {
    EASY: "easy",
    HARD: "hard",
} as const;

export const DIFFICULTY_LABELS = {
    [DIFFICULTY.EASY]: "Easy 🟢",
    [DIFFICULTY.HARD]: "Hard 🔴",
} as const;
