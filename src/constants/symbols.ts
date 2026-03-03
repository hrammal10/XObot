export const SYMBOLS = Object.freeze({
    X: "❌",
    O: "⭕",
} as const);

export const RESULT_EMOJI = Object.freeze({
    win: "✅",
    loss: "❌",
    draw: "➖",
} as const);

export const MEDAL_EMOJI = Object.freeze({
    FIRST: "🥇",
    SECOND: "🥈",
    THIRD: "🥉",
} as const);

export const MODE_EMOJI = Object.freeze({
    PVE: "🤖",
    PVP: "👤",
} as const);

export function getSymbolEmoji(symbol: "X" | "O"): string {
    return symbol === "X" ? SYMBOLS.X : SYMBOLS.O;
}
