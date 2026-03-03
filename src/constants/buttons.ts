export const BUTTON_LABELS = Object.freeze({
    PLAY_VS_BOT: "PvE",
    CHALLENGE_FRIEND: "PvP",
    EASY: "Easy 🟢",
    HARD: "Hard 🔴",
    RETURN: "Return",
    INVITE: "Click to invite!",
    REMATCH: (count: number, total: number) => `Rematch (${count}/${total})`,
} as const);
