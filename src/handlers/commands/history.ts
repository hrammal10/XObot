import { CommandContext, Context } from "grammy";
import { PrismaClient } from "../../generated/prisma/client";
import logger from "../../utils/logger";
import { MESSAGES } from "../../constants/userMessages";
import { RESULT_EMOJI, MODE_EMOJI } from "../../constants/symbols";

const prisma = new PrismaClient();

export async function historyCommand(ctx: CommandContext<Context>): Promise<void> {
    if (!ctx.from) {
        await ctx.reply(MESSAGES.USER_NOT_IDENTIFIED);
        return;
    }

    try {
        const telegramId = BigInt(ctx.from.id);
        const games = await getPlayerGames(telegramId);

        if (games.length === 0) {
            await ctx.reply(MESSAGES.NO_GAMES_PLAYED_HISTORY);
            return;
        }

        const stats = calculateStats(games, telegramId);
        const historyLines = await formatGameHistory(games, telegramId);

        const message =
            MESSAGES.HISTORY_HEADER +
            MESSAGES.HISTORY_STATS(stats.wins, stats.losses, stats.draws) +
            MESSAGES.RECENT_GAMES_HEADER +
            historyLines.join("\n");

        await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
        logger.error("Failed to fetch history:", error);
        await ctx.reply(MESSAGES.HISTORY_LOAD_ERROR);
    }
}

async function getPlayerGames(telegramId: bigint) {
    return prisma.game.findMany({
        where: {
            players: {
                some: { playerTelegramId: telegramId },
            },
        },
        include: {
            players: true,
        },
        orderBy: {
            completedAt: "desc",
        },
        take: 10,
    });
}

function calculateStats(games: Awaited<ReturnType<typeof getPlayerGames>>, telegramId: bigint) {
    return games.reduce(
        (acc, game) => {
            const result = getGameResult(game, telegramId);
            acc[result === "win" ? "wins" : result === "loss" ? "losses" : "draws"]++;
            return acc;
        },
        { wins: 0, losses: 0, draws: 0 }
    );
}

function getGameResult(
    game: Awaited<ReturnType<typeof getPlayerGames>>[0],
    telegramId: bigint
): "win" | "loss" | "draw" {
    if (game.status === "draw") {
        return "draw";
    }
    return game.winnerTelegramId === telegramId ? "win" : "loss";
}

async function formatGameHistory(
    games: Awaited<ReturnType<typeof getPlayerGames>>,
    telegramId: bigint
): Promise<string[]> {
    return Promise.all(
        games.map(async (game) => {
            const result = getGameResult(game, telegramId);
            const emoji = RESULT_EMOJI[result];
            const opponent = await getOpponentInfo(game, telegramId);
            const date = formatDate(game.completedAt);
            const mode = game.gameMode === "pve" ? MODE_EMOJI.PVE : MODE_EMOJI.PVP;

            return `${emoji} ${mode} vs ${opponent} • ${date}`;
        })
    );
}

async function getOpponentInfo(
    game: Awaited<ReturnType<typeof getPlayerGames>>[0],
    telegramId: bigint
): Promise<string> {
    if (game.gameMode === "pve") {
        return MESSAGES.BOT_OPPONENT;
    }

    const opponentEntry = game.players.find((p) => p.playerTelegramId !== telegramId);
    if (!opponentEntry) {
        return MESSAGES.UNKNOWN_PLAYER;
    }

    const opponent = await prisma.player.findUnique({
        where: { telegramId: opponentEntry.playerTelegramId },
    });

    return opponent?.username ? `@${opponent.username}` : MESSAGES.UNKNOWN_PLAYER;
}

function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return MESSAGES.DATE_TODAY;
    }
    if (days === 1) {
        return MESSAGES.DATE_YESTERDAY;
    }
    if (days < 7) {
        return MESSAGES.DATE_DAYS_AGO(days);
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
