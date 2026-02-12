import { CommandContext, Context } from "grammy";
import { PrismaClient, Prisma } from "../../generated/prisma/client";
import { MESSAGES } from "../../constants/userMessages";
import { MEDAL_EMOJI } from "../../constants/symbols";
import logger from "../../utils/logger";

const prisma = new PrismaClient();

const LEADERBOARD_LIMIT = 10;

async function fetchTopPlayersByWins(limit: number) {
    return prisma.gamePlayer.groupBy({
        by: ["playerTelegramId"],
        where: { isWinner: true },
        _count: { isWinner: true },
        orderBy: { _count: { isWinner: "desc" } },
        take: limit,
    });
}

type WinCount = Awaited<ReturnType<typeof fetchTopPlayersByWins>>[number];

export async function leaderboardCommand(ctx: CommandContext<Context>): Promise<void> {
    if (!ctx.from) {
        await ctx.reply(MESSAGES.USER_NOT_IDENTIFIED);
        return;
    }

    try {
        const topPlayers = await fetchTopPlayersByWins(LEADERBOARD_LIMIT);

        if (topPlayers.length === 0) {
            await ctx.reply(MESSAGES.NO_GAMES_PLAYED_LEADERBOARD);
            return;
        }

        const leaderboardLines = await formatLeaderboard(topPlayers);
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
    if (!entry.playerTelegramId) {
        return `${getRankDisplay(index)} ${MESSAGES.UNKNOWN_PLAYER} - 0 wins`;
    }

    const player = await prisma.player.findUnique({
        where: { telegramId: entry.playerTelegramId },
    });

    const rank = getRankDisplay(index);
    const username = player?.username || MESSAGES.UNKNOWN_PLAYER;
    const wins = entry._count.isWinner;

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
