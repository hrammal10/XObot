export const SYMBOLS = Object.freeze(
    Object.seal({
        X: "❌",
        O: "⭕",
    } as const)
);

export const RESULT_EMOJI = Object.freeze(
    Object.seal({
        win: "✅",
        loss: "❌",
        draw: "➖",
    } as const)
);

export const MEDAL_EMOJI = Object.freeze(
    Object.seal({
        FIRST: "🥇",
        SECOND: "🥈",
        THIRD: "🥉",
    } as const)
);

export const MODE_EMOJI = Object.freeze(
    Object.seal({
        PVE: "🤖",
        PVP: "👤",
    } as const)
);

export function getSymbolEmoji(symbol: "X" | "O"): string {
    return symbol === "X" ? SYMBOLS.X : SYMBOLS.O;
}
