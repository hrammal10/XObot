import { CommandContext, Context } from "grammy";
import { getLeaderboard } from "../../solana";
import { MESSAGES } from "../../constants/userMessages";
import { MEDAL_EMOJI } from "../../constants/symbols";
import logger from "../../utils/logger";

type WinCount = {
    playerTelegramId: number;
    username?: string;
    wins: number;
};

export async function leaderboardCommand(ctx: CommandContext<Context>): Promise<void> {
    if (!ctx.from) {
        await ctx.reply(MESSAGES.USER_NOT_IDENTIFIED);
        return;
    }

    try {
        const topPlayers = await getLeaderboard();

        if (topPlayers.length === 0) {
            await ctx.reply(MESSAGES.NO_GAMES_PLAYED_LEADERBOARD);
            return;
        }

        const leaderboardLines = await formatLeaderboard(
            topPlayers.map((p) => ({
                playerTelegramId: p.telegramId.toNumber(),
                username: p.username,
                wins: p.totalWins,
            }))
        );
        await ctx.reply(MESSAGES.LEADERBOARD_HEADER + leaderboardLines.join("\n"), {
            parse_mode: "Markdown",
        });
    } catch (error) {
        logger.error("Failed to fetch leaderboard:", error);
        await ctx.reply(MESSAGES.LEADERBOARD_LOAD_ERROR);
    }
}

async function formatLeaderboard(players: WinCount[]): Promise<string[]> {
    if (players.length === 0) {
        return [];
    }
    return Promise.all(players.map((entry, index) => formatLeaderboardEntry(entry, index)));
}

async function formatLeaderboardEntry(entry: WinCount, index: number): Promise<string> {
    const rank = getRankDisplay(index);
    const username = entry.username || MESSAGES.UNKNOWN_PLAYER;
    const wins = entry.wins;
    return `${rank} @${username} - ${wins} wins`;
}

function getRankDisplay(index: number): string {
    const medals: Record<number, string> = {
        0: MEDAL_EMOJI.FIRST,
        1: MEDAL_EMOJI.SECOND,
        2: MEDAL_EMOJI.THIRD,
    };

    return medals[index] ?? `${index + 1}.`;
}
