import { Game } from "../game/types";
import { getHeadToHeadStats } from "../database/models/playerStatsModel";

export async function getStatsText(currentPlayerId: number, opponentId: number): Promise<string> {
    const stats = await getHeadToHeadStats(currentPlayerId, opponentId);

    if (stats) {
        const isCurrentPlayerMin = currentPlayerId < opponentId;
        const myWins = isCurrentPlayerMin ? stats.player1Wins : stats.player2Wins;
        const theirWins = isCurrentPlayerMin ? stats.player2Wins : stats.player1Wins;
        return `Record: ${myWins}-${theirWins}-${stats.draws} (W-L-D)`;
    } else {
        return `Record: 0-0-0 (W-L-D)`;
    }
}

export async function formatPvPMessage(
    game: Game,
    currentPlayerId: number,
    baseMessage: string
): Promise<string> {
    if (game.mode !== "pvp" || game.players.length < 2) {
        return baseMessage;
    }

    const currentPlayer = game.players.find((p) => p.id === currentPlayerId);
    const opponent = game.players.find((p) => p.id !== null && p.id !== currentPlayerId);

    if (!currentPlayer?.id || !opponent?.id) {
        return baseMessage;
    }

    const statsText = await getStatsText(currentPlayer.id, opponent.id);
    return `${statsText}\n\n${baseMessage}`;
}
