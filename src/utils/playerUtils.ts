import { Context } from "grammy";
import { Game, Player } from "../game/types";
import { updateGame } from "../game/gameManager";

export function extractUser(ctx: Context) {
    return {
        id: ctx.from!.id,
        chatId: ctx.chat?.id,
        username: ctx.from!.username,
    };
}

export function getPlayerById(game: Game, userId: number): Player | undefined {
    return game.players.find((p) => p.id === userId);
}

export function getOpponent(game: Game, userId: number): Player | undefined {
    return game.players.find((p) => p.id !== userId && p.id !== null);
}

export function getNextTurnIndex(game: Game): number {
    const playerCount = game.players.length;
    if (playerCount === 0) {
        return 0;
    }
    let nextIndex = (game.currentTurn + 1) % playerCount;

    let attempts = 0;
    while (game.players[nextIndex].id === null || game.players[nextIndex].id === undefined) {
        nextIndex = (nextIndex + 1) % playerCount;
        attempts++;
        if (attempts >= playerCount) {
            return game.currentTurn; // no valid next player — stay on current turn
        }
    }

    return nextIndex;
}

export function formatOpponentText(username: string | undefined): string {
    return username ? `vs @${username}\n` : "";
}

export function updatePlayerMessageId(
    game: Game,
    userId: number,
    messageId: number,
    gameId: string
): void {
    const updatedPlayers = [...game.players];
    const playerIndex = updatedPlayers.findIndex((p) => p.id === userId);
    if (playerIndex !== -1) {
        updatedPlayers[playerIndex] = {
            ...updatedPlayers[playerIndex],
            messageId: messageId,
        };
        updateGame(gameId, { players: updatedPlayers });
    }
}
