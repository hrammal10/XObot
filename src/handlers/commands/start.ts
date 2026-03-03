import { CommandContext, Context, Bot } from "grammy";
import { MESSAGES } from "../../constants/userMessages";
import { getSymbolEmoji } from "../../constants/symbols";
import { joinGame, updateGame, getGame } from "../../game/gameManager";
import { extractUser, getPlayerById, getOpponent } from "../../utils/playerUtils";
import { buildGameKeyboard } from "../../ui/keyboard";
import { CALLBACK_PREFIXES } from "../../constants/callback";
import { initPlayer } from "../../solana";
import { getStatsText } from "../../utils/messageFormatters";
import { Player, Game } from "../../game/types";
import { InlineKeyboard } from "grammy";
import logger from "../../utils/logger";
import { buildHomeKeyboard } from "../callbacks/menu";

export async function startCommand(ctx: CommandContext<Context>, bot: Bot): Promise<void> {
    if (!ctx.from) {
        await ctx.reply(MESSAGES.USER_NOT_IDENTIFIED);
        return;
    }
    if (!ctx.chat) {
        await ctx.reply(MESSAGES.CHAT_NOT_FOUND);
        return;
    }

    const payload = ctx.match;
    const isJoinRequest = payload?.startsWith(CALLBACK_PREFIXES.JOIN);
    if (!isJoinRequest) {
        const keyboard = buildHomeKeyboard();
        await ctx.reply(MESSAGES.WELCOME, { reply_markup: keyboard });
        return;
    }
    const gameId = extractGameId(payload);
    if (!gameId) {
        await ctx.reply(MESSAGES.GAME_NOT_FOUND);
        return;
    }

    const user = extractUser(ctx);
    const joinResult = joinGame(gameId, user.id, user.chatId!, user.username);
    if (!joinResult.success) {
        await ctx.reply(joinResult.error ?? MESSAGES.UNEXPECTED_ERROR);
        return;
    }
    const game = joinResult.game;
    if (!game) {
        await ctx.reply(MESSAGES.GAME_NOT_FOUND);
        return;
    }
    const joiner = getPlayerById(game, user.id);
    if (!joiner || !joiner.id) {
        await ctx.reply(MESSAGES.UNEXPECTED_ERROR);
        return;
    }
    const opponent = getOpponent(game, user.id);
    await ensurePlayersExist(joiner, opponent);
    const statsText = await buildStatsText(joiner, opponent);
    const keyboard = buildGameKeyboard(game.board, game.id);

    try {
        const joinerMessage = await sendJoinerMessage(ctx, {
            statsText,
            joiner,
            opponent,
            game,
            keyboard,
        });
        await updateJoinerMessageId(gameId, joinerMessage.message_id, joiner.id);
        await updateCreatorMessage(bot, {
            game,
            joiner,
            opponent,
            keyboard,
        });
    } catch (error) {
        logger.error("Failed to send game messages:", error);
        await ctx.reply(MESSAGES.UNEXPECTED_ERROR);
    }
}

function extractGameId(payload: string): string {
    return payload.slice(CALLBACK_PREFIXES.JOIN.length);
}

async function ensurePlayersExist(joiner: Player, opponent?: Player) {
    const promises: Promise<any>[] = [];
    if (joiner.id) {
        promises.push(initPlayer(joiner.id, joiner.username ?? "unknown"));
    }
    if (opponent?.id) {
        promises.push(initPlayer(opponent.id, opponent.username ?? "unknown"));
    }
    await Promise.all(promises);
}

async function buildStatsText(joiner: Player, opponent?: Player): Promise<string> {
    if (!opponent?.id || !joiner.id) return "";
    return await getStatsText(joiner.id, opponent.id);
}

async function sendJoinerMessage(
    ctx: CommandContext<Context>,
    {
        statsText,
        joiner,
        opponent,
        game,
        keyboard,
    }: {
        statsText: string;
        joiner: Player;
        opponent?: Player;
        game: Game;
        keyboard: InlineKeyboard;
    }
) {
    const symbol = getSymbolEmoji(joiner.symbol);
    const isTurn = game.currentTurn === game.players.indexOf(joiner);
    const turnText = isTurn ? MESSAGES.YOUR_TURN : MESSAGES.WAITING_FOR_OPPONENT;

    const messageText = `${statsText}\n\n${MESSAGES.GAME_JOINED(
        opponent?.username,
        symbol,
        turnText
    )}`;

    return ctx.reply(messageText, { reply_markup: keyboard });
}

async function updateJoinerMessageId(gameId: string, messageId: number, joinerId: number) {
    const game = getGame(gameId);
    if (!game) return;

    const updatedPlayers = game.players.map((p) => (p.id === joinerId ? { ...p, messageId } : p));

    updateGame(gameId, { players: updatedPlayers });
}

async function updateCreatorMessage(
    bot: Bot,
    {
        game,
        joiner,
        opponent,
        keyboard,
    }: {
        game: Game;
        joiner: Player;
        opponent?: Player;
        keyboard: InlineKeyboard;
    }
): Promise<void> {
    if (!opponent?.chatId || !opponent.messageId || !opponent.id || !joiner.id) {
        return;
    }

    const symbol = getSymbolEmoji(opponent.symbol);
    const isTurn = game.currentTurn === game.players.indexOf(opponent);

    const statsText = await getStatsText(opponent.id, joiner.id);
    const baseMessage = MESSAGES.OPPONENT_JOINED(joiner.username, symbol, isTurn);

    const messageText = `${statsText}\n\n${baseMessage}`;

    try {
        await bot.api.editMessageText(opponent.chatId, opponent.messageId, messageText, {
            reply_markup: keyboard,
        });
    } catch (error) {
        logger.error(`Failed to update creator message:`, error);
    }
}
