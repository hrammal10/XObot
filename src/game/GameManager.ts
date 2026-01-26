import { Game } from "./types";
import { createEmptyBoard }from "./GameLogic"
import { join } from "path";

const activeGames = new Map<string, Game>()

export function generateGameId(){
    const gameId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    return gameId
}

export function createGame(playerXId: number, playerXChatId: number, mode: "pve" | "pvp", difficulty?: "easy" | "hard", creatorUsername?: string){
    const creatorIsX = Math.random() < 0.5;
    const game: Game = {
        id: generateGameId(),
        board: createEmptyBoard(),
        currentTurn: "X",
        status: mode === "pve" ? "playing" : "waiting",
        mode: mode,
        winner: null,
        playerX: creatorIsX ? playerXId : null,
        playerO: creatorIsX ? null : playerXId,
        playerXChatId: creatorIsX ? playerXChatId : undefined,
        playerOChatId: creatorIsX ? undefined : playerXChatId,
        messageIdX: undefined,
        messageIdO: undefined,
        difficulty: difficulty,
        playerXUsername: creatorIsX ? creatorUsername : undefined,
        playerOUsername: creatorIsX ? undefined : creatorUsername
    }
    activeGames.set(game.id, game)
    return game
}

export function getGame(gameId: string){
    return activeGames.get(gameId)
}

export function updateGame(gameId: string, updates: Partial<Game>){
   const originalGame = getGame(gameId)
   if (originalGame){
    const updatedGame = { ...originalGame, ...updates};
    activeGames.set(gameId, updatedGame);
   }
}

export function deleteGame(gameId: string){
    activeGames.delete(gameId)
}

export function joinGame(gameId: string, playerOId: number, playerOChatId: number, joinerUsername?: string){
    const originalGame = getGame(gameId);
    if (!originalGame){
        return { success: false, error: "Game not found"}
    }
    if (originalGame.status === "playing"){
        return { success: false, error: "Game is already in progress"};
    }
    if (originalGame.status === "won" || originalGame.status === "draw"){
        return { success: false, error: "Game is already done."}
    }
    if (originalGame.playerX === playerOId || originalGame.playerO === playerOId){
        return { success: false, error: "Can't join your own game"}
    }
    if (originalGame.playerX === null){
        updateGame(gameId, {
            status: "playing",
            playerX: playerOId,
            playerXChatId: playerOChatId,
            playerXUsername: joinerUsername
        })
    } else {
        updateGame(gameId, {
            status: "playing",
            playerO: playerOId,
            playerOChatId: playerOChatId,
            playerOUsername: joinerUsername
        })
    }
    const updatedGame = getGame(gameId);
    const joinerSymbol = updatedGame?.playerX === playerOId ? "X" : "O";
    return { success: true, game: updatedGame, joinerSymbol}
}