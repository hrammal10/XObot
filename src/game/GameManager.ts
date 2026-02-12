import { Game, Player } from "./types";
import { createEmptyBoard } from "./gameLogic";
import { MESSAGES } from "../constants/userMessages";

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
): Game | null {
    if (rows <= 0 || cols <= 0) {
        return null;
    }
    if (mode === "pve" && !difficulty) {
        return null;
    }

    const creatorIsX = Math.random() < 0.5;
    const creatorIndex = creatorIsX ? 0 : 1;
    const otherIndex = creatorIsX ? 1 : 0;

    const creator: Player = {
        index: creatorIndex,
        id: creatorId,
        chatId: creatorChatId,
        username: creatorUsername,
        symbol: creatorIsX ? "X" : "O",
    };
    const otherPlayer: Player = {
        index: otherIndex,
        id: mode === "pve" ? null : null,
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
        rematchVoters: [],
        players: creatorIsX ? [creator, otherPlayer] : [otherPlayer, creator],
    };
    activeGames.set(game.id, game);
    return game;
}

export function getGame(gameId: string): Game | undefined {
    if (!gameId) {
        return undefined;
    }
    return activeGames.get(gameId);
}

export function updateGame(gameId: string, updates: Partial<Game>): void {
    if (!gameId) {
        return;
    }
    const originalGame = getGame(gameId);
    if (!originalGame) {
        return;
    }
    const updatedGame = { ...originalGame, ...updates };
    activeGames.set(gameId, updatedGame);
}

export function deleteGame(gameId: string): void {
    if (!gameId) {
        return;
    }
    activeGames.delete(gameId);
}

export function joinGame(
    gameId: string,
    joinerId: number,
    joinerChatId: number,
    joinerUsername?: string
) {
    if (!gameId) {
        return { success: false, error: MESSAGES.GAME_NOT_FOUND };
    }
    if (!joinerId || !joinerChatId) {
        return { success: false, error: MESSAGES.USER_NOT_IDENTIFIED };
    }

    const game = getGame(gameId);
    if (!game) {
        return { success: false, error: MESSAGES.GAME_NOT_FOUND };
    }
    if (game.status === "playing") {
        return { success: false, error: MESSAGES.GAME_IN_PROGRESS };
    }
    if (game.status === "won" || game.status === "draw") {
        return { success: false, error: MESSAGES.GAME_ALREADY_ENDED };
    }

    if (game.players.some((p) => p.id === joinerId)) {
        return { success: false, error: MESSAGES.CANT_JOIN_OWN_GAME };
    }

    const emptySlotIndex = game.players.findIndex((p) => p.id === null && p.chatId === undefined);
    if (emptySlotIndex === -1) {
        return { success: false, error: MESSAGES.GAME_FULL };
    }
    const updatedPlayers = [...game.players];
    updatedPlayers[emptySlotIndex] = {
        index: emptySlotIndex,
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
