export type Cell = "X" | "O" | null;

export type PlayerSymbol = "X" | "O";

export type GameStatus = "waiting" | "playing" | "won" | "draw"

export interface Game {
    id: string;
    board: Cell[];
    currentTurn: PlayerSymbol;
    status: GameStatus;
    mode: "pve" | "pvp";
    winner: PlayerSymbol | null;
    playerX: number | null;
    playerO: number | null;
    playerXChatId?: number;
    playerOChatId?: number;
    messageIdX?: number; 
    messageIdO?: number;
    difficulty?: "easy" | "hard";
    rematchRequests?: number[];
    creatorUsername?: string;
    playerXUsername?: string;
    playerOUsername?: string;
}