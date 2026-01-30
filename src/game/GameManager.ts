import { Game, Player } from "./types";
import { createEmptyBoard } from "./gameLogic";

const activeGames = new Map<string, Game>();

export function generateGameId() {
    const gameId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    return gameId;
}

export function createGame(
    creatorId: number,
    creatorChatId: number,
    mode: "pve" | "pvp",
    rows: number,
    cols: number,
    difficulty?: "easy" | "hard",
    creatorUsername?: string
) {
    const creatorIsX = Math.random() < 0.5;
    const creator: Player = {
        id: creatorId,
        chatId: creatorChatId,
        username: creatorUsername,
        symbol: creatorIsX ? "X" : "O",
    };
    const otherPlayer: Player = {
        id: mode === "pve" ? null : undefined,
        symbol: creatorIsX ? "O" : "X",
    };
    const game: Game = {
        id: generateGameId(),
        board: createEmptyBoard(rows, cols),
        currentTurn: 0,
        status: mode === "pve" ? "playing" : "waiting",
        mode,
        difficulty,
        rematchCount: 0,
        players: creatorIsX ? [creator, otherPlayer] : [otherPlayer, creator],
    };
    activeGames.set(game.id, game);
    return game;
}

export function getGame(gameId: string) {
    return activeGames.get(gameId);
}

export function updateGame(gameId: string, updates: Partial<Game>) {
    const originalGame = getGame(gameId);
    if (originalGame) {
        const updatedGame = { ...originalGame, ...updates };
        activeGames.set(gameId, updatedGame);
    }
}

export function deleteGame(gameId: string) {
    activeGames.delete(gameId);
}

export function joinGame(
    gameId: string,
    joinerId: number,
    joinerChatId: number,
    joinerUsername?: string
) {
    const game = getGame(gameId);
    if (!game) {
        return { success: false, error: "Game not found" };
    }
    if (game.status === "playing") {
        return { success: false, error: "Game is already in progress" };
    }
    if (game.status === "won" || game.status === "draw") {
        return { success: false, error: "Game is already done." };
    }

    if (game.players.some((p) => p.id === joinerId)) {
        return { success: false, error: "Can't join your own game" };
    }

    const emptySlotIndex = game.players.findIndex((p) => p.id === undefined);
    if (emptySlotIndex === -1) {
        return { success: false, error: "Game is full" };
    }
    const updatedPlayers = [...game.players];
    updatedPlayers[emptySlotIndex] = {
        id: joinerId,
        chatId: joinerChatId,
        username: joinerUsername,
        symbol: updatedPlayers[emptySlotIndex].symbol,
    };
    updateGame(gameId, {
        players: updatedPlayers,
        status: "playing",
    });

    const updatedGame = getGame(gameId);
    const joinerSymbol = updatedPlayers[emptySlotIndex].symbol;

    return { success: true, game: updatedGame, joinerSymbol };
}
