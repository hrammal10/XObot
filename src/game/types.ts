export type Cell = "X" | "O" | null;

export type PlayerSymbol = "X" | "O";

export type GameStatus = "waiting" | "playing" | "won" | "draw";

export interface Player {
    id: number | null | undefined;
    chatId?: number;
    username?: string;
    symbol: "X" | "O";
    messageId?: number;
}

export interface Game {
    id: string;
    board: Cell[][];
    currentTurn: number;
    status: GameStatus;
    mode: "pve" | "pvp";
    winner?: number;
    difficulty?: "easy" | "hard";
    rematchCount: number;
    players: Player[];
}
