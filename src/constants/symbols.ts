export const SYMBOLS = {
    X: "❌",
    O: "⭕",
} as const;

export function getSymbolEmoji(symbol: "X" | "O"): string {
    return symbol === "X" ? SYMBOLS.X : SYMBOLS.O;
}
