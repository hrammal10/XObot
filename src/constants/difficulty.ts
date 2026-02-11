export const DIFFICULTY = Object.freeze(
    Object.seal({
        EASY: "easy",
        HARD: "hard",
    } as const)
);

export const DIFFICULTY_LABELS = Object.freeze(
    Object.seal({
        [DIFFICULTY.EASY]: "Easy 🟢",
        [DIFFICULTY.HARD]: "Hard 🔴",
    } as const)
);
