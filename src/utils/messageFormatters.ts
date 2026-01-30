import { Game } from "../game/types";
import { getHeadToHeadStats } from "../database/models/playerStatsModel";

export async function getStatsText(currentPlayerId: number, opponentId: number): Promise<string> {
    const stats = await getHeadToHeadStats(currentPlayerId, opponentId);

    if (stats) {
        const isCurrentPlayerMin = currentPlayerId < opponentId;
        const myWins = isCurrentPlayerMin ? stats.player1_wins : stats.player2_wins;
        const theirWins = isCurrentPlayerMin ? stats.player2_wins : stats.player1_wins;
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
    if (game.mode !== "pvp") {
        return baseMessage;
    }

    const opponent = game.players.find((p) => p.id !== currentPlayerId && p.id !== null);

    if (!opponent?.id) {
        return baseMessage;
    }

    const statsText = await getStatsText(currentPlayerId, opponent.id);
    return `${statsText}\n\n${baseMessage}`;
}
