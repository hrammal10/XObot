import { Game, Player } from "../game/types";
import { updateGame } from "../game/gameManager";

export function getPlayerById(game: Game, userId: number): Player | undefined {
    return game.players.find((p) => p.id === userId);
}

export function getOpponent(game: Game, userId: number): Player | undefined {
    return game.players.find((p) => p.id !== userId && p.id !== null);
}

export function getNextTurnIndex(game: Game): number {
    let nextIndex = (game.currentTurn + 1) % game.players.length;

    while (game.players[nextIndex].id === null || game.players[nextIndex].id === undefined) {
        nextIndex = (nextIndex + 1) % game.players.length;
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
