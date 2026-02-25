import { CommandContext, Context } from "grammy";
import { getPlayerHistory, getPlayerUsername, GameRecordAccount } from "../../solana";
import { BN } from "@coral-xyz/anchor";
import logger from "../../utils/logger";
import { MESSAGES } from "../../constants/userMessages";
import { RESULT_EMOJI, MODE_EMOJI } from "../../constants/symbols";

export async function historyCommand(ctx: CommandContext<Context>): Promise<void> {
    if (!ctx.from) {
        await ctx.reply(MESSAGES.USER_NOT_IDENTIFIED);
        return;
    }

    try {
        const telegramId = ctx.from.id;
        const games = await getPlayerHistory(telegramId);

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

function calculateStats(games: GameRecordAccount[], telegramId: number) {
    return games.reduce(
        (acc, game) => {
            const result = getGameResult(game, telegramId);
            acc[result === "win" ? "wins" : result === "loss" ? "losses" : "draws"]++;
            return acc;
        },
        { wins: 0, losses: 0, draws: 0 }
    );
}

function getGameResult(game: GameRecordAccount, telegramId: number): "win" | "loss" | "draw" {
    if (game.status === "draw") {
        return "draw";
    }
    if (game.winnerTelegramId && game.winnerTelegramId.eq(new BN(telegramId))) {
        return "win";
    }
    return "loss";
}

async function formatGameHistory(
    games: GameRecordAccount[],
    telegramId: number
): Promise<string[]> {
    if (games.length === 0) {
        return [];
    }

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
    game: GameRecordAccount,
    telegramId: number
): Promise<string> {
    if (game.gameMode === "pve") {
        return MESSAGES.BOT_OPPONENT;
    }

    const isPlayer1 = game.player1TelegramId.eq(new BN(telegramId));
    const opponentId = isPlayer1 ? game.player2TelegramId : game.player1TelegramId;
    const username = await getPlayerUsername(opponentId.toNumber());

    return username ? `@${username}` : MESSAGES.UNKNOWN_PLAYER;
}

function formatDate(timestamp: BN): string {
    const date = new Date(timestamp.toNumber() * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 0) {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

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
