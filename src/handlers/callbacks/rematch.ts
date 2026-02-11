import { CallbackQueryContext, Context, Bot, InlineKeyboard } from "grammy";
import { MESSAGES } from "../../constants/userMessages";
import { getSymbolEmoji } from "../../constants/symbols";
import { BOARD } from "../../constants/gameConfig";
import { createGame, updateGame, getGame, deleteGame } from "../../game/gameManager";
import { getPlayerById, getOpponent, getNextTurnIndex } from "../../utils/playerUtils";
import { getBotMove, makeMove } from "../../game/gameLogic";
import { buildGameKeyboard } from "../../ui/keyboard";
import { CALLBACK_PREFIXES } from "../../constants/callback";
import { getStatsText } from "../../utils/messageFormatters";
import { Game, Cell, Player } from "../../game/types";
import logger from "../../utils/logger";

export async function rematchCallback(ctx: CallbackQueryContext<Context>, bot: Bot) {
    const gameId = extractGameId(ctx.callbackQuery.data);
    const game = getGame(gameId);
    if (!game) return notifyGameNotFound(ctx);
    const userId = ctx.from.id;
    const chatId = ctx.chat?.id;
    if (!chatId) return notifyChatNotFound(ctx);
    if (game.mode === "pve") {
        return handlePvERematch(ctx, game, userId, chatId);
    }
    return handlePvPRematch(ctx, bot, game, userId, gameId);
}

function extractGameId(data: string): string {
    return data.slice(CALLBACK_PREFIXES.REMATCH.length);
}

async function notifyGameNotFound(ctx: CallbackQueryContext<Context>) {
    await ctx.answerCallbackQuery({ text: MESSAGES.GAME_NOT_FOUND, show_alert: true });
}

async function notifyChatNotFound(ctx: CallbackQueryContext<Context>) {
    await ctx.answerCallbackQuery({ text: MESSAGES.CHAT_NOT_FOUND, show_alert: true });
}

async function handlePvERematch(
    ctx: CallbackQueryContext<Context>,
    game: Game,
    userId: number,
    chatId: number
): Promise<void> {
    if (!isGameFinished(game)) {
        await ctx.answerCallbackQuery({ text: MESSAGES.GAME_IN_PROGRESS, show_alert: true });
        return;
    }
    const newGame = createGame(userId, chatId, "pve", BOARD.ROWS, BOARD.COLS, game.difficulty);
    const { boardToShow, currentTurn } = computeInitialPvEBoard(newGame);
    const keyboard = buildGameKeyboard(boardToShow, newGame.id);
    const userPlayer = getPlayerById(newGame, userId)!;
    const userSymbol = getSymbolEmoji(userPlayer.symbol);
    await ctx.editMessageText(MESSAGES.REMATCH_WITH_SYMBOL(userSymbol), {
        reply_markup: keyboard,
    });
    updateGame(newGame.id, {
        board: boardToShow,
        currentTurn,
        players: updatePlayerMessageId(newGame.players, userId, ctx.msgId!),
    });
    await ctx.answerCallbackQuery();
}

function isGameFinished(game: Game): boolean {
    return game.status === "won" || game.status === "draw";
}

function computeInitialPvEBoard(newGame: Game): { boardToShow: Cell[][]; currentTurn: number } {
    const botPlayer = newGame.players.find((p) => p.id === null);
    if (!botPlayer || botPlayer.symbol !== "X") {
        return { boardToShow: newGame.board, currentTurn: newGame.currentTurn };
    }
    const [r, c] = getBotMove(newGame.board, newGame.difficulty!, "X");
    const updatedBoard = makeMove(newGame.board, r, c, "X");
    const nextTurn = getNextTurnIndex({ ...newGame, currentTurn: newGame.currentTurn });
    return { boardToShow: updatedBoard, currentTurn: nextTurn };
}

function updatePlayerMessageId(players: Player[], userId: number, messageId: number): Player[] {
    return players.map((p) => (p.id === userId ? { ...p, messageId } : p));
}

async function handlePvPRematch(
    ctx: CallbackQueryContext<Context>,
    bot: Bot,
    game: Game,
    userId: number,
    gameId: string
): Promise<void> {
    if (!isGameFinished(game)) {
        await ctx.answerCallbackQuery({ text: MESSAGES.GAME_IN_PROGRESS, show_alert: true });
        return;
    }
    const player = getPlayerById(game, userId);
    if (!player) {
        await ctx.answerCallbackQuery({ text: MESSAGES.NOT_IN_GAME, show_alert: true });
        return;
    }

    const hasAlreadyVoted = game.rematchVoters?.includes(userId);
    if (hasAlreadyVoted) {
        await ctx.answerCallbackQuery({ text: "You already voted for rematch!", show_alert: true });
        return;
    }

    const voters = [...(game.rematchVoters || []), userId];
    const newCount = voters.length;
    const totalPlayers = game.players.filter((p) => p.id !== null).length;
    const votesNeeded = Math.floor(totalPlayers / 2) + 1; // Strictly greater than half

    updateGame(gameId, { rematchCount: newCount, rematchVoters: voters });

    if (newCount < votesNeeded) {
        await handlePartialRematchVote(ctx, bot, game, gameId, newCount, votesNeeded);
        return;
    }

    await startNewPvPGame(ctx, bot, game, gameId);
}

async function handlePartialRematchVote(
    ctx: CallbackQueryContext<Context>,
    bot: Bot,
    game: Game,
    gameId: string,
    currentVotes: number,
    votesNeeded: number
): Promise<void> {
    const keyboard = buildGameKeyboard(game.board, gameId);
    keyboard.row();
    keyboard.text(
        `Rematch (${currentVotes}/${votesNeeded})`,
        `${CALLBACK_PREFIXES.REMATCH}${gameId}`
    );

    const updatePromises = game.players
        .filter((p) => p.chatId && p.messageId && p.id !== null)
        .map((p) =>
            bot.api
                .editMessageReplyMarkup(p.chatId!, p.messageId!, { reply_markup: keyboard })
                .catch((e) => logger.error(`Failed to update rematch button:`, e))
        );

    await Promise.all([
        ctx.answerCallbackQuery({ text: MESSAGES.REMATCH_REQUESTED }),
        ...updatePromises,
    ]);
}

async function startNewPvPGame(
    ctx: CallbackQueryContext<Context>,
    bot: Bot,
    game: Game,
    gameId: string
): Promise<void> {
    const [oldP1, oldP2] = game.players;
    if (!oldP1.id || !oldP1.chatId || !oldP2.id || !oldP2.chatId) return;

    const newGame = createGame(
        oldP1.id,
        oldP1.chatId,
        "pvp",
        BOARD.ROWS,
        BOARD.COLS,
        undefined,
        oldP1.username
    );
    const updatedPlayers = newGame.players.map((player) => {
        if (player.id === oldP1.id) {
            return { ...player, messageId: oldP1.messageId };
        }
        if (player.id === null) {
            // empty slot - assign oldP2
            return {
                ...player,
                id: oldP2.id,
                chatId: oldP2.chatId,
                username: oldP2.username,
                messageId: oldP2.messageId,
            };
        }
        return player;
    });

    updateGame(newGame.id, { players: updatedPlayers, status: "playing" });
    const freshGame = getGame(newGame.id)!;
    const keyboard = buildGameKeyboard(freshGame.board, freshGame.id);

    await Promise.all([
        updateBothPlayersMessages(bot, freshGame, keyboard),
        ctx.answerCallbackQuery({ text: MESSAGES.REMATCH_STARTED_TEXT }),
    ]);
    deleteGame(gameId);
}

function assignSecondPlayer(players: Player[], p2: Player): Player[] {
    const emptyIndex = players.findIndex((p) => p.id === null && p.chatId === undefined);
    const updated = [...players];
    updated[emptyIndex] = {
        index: emptyIndex,
        id: p2.id,
        chatId: p2.chatId,
        username: p2.username,
        symbol: updated[emptyIndex].symbol,
        messageId: p2.messageId,
    };
    return updated;
}

async function updateBothPlayersMessages(
    bot: Bot,
    game: Game,
    keyboard: InlineKeyboard
): Promise<void> {
    const updatePromises = game.players
        .filter(
            (player) =>
                player.chatId && player.messageId && player.id !== null && player.id !== undefined
        )
        .map(async (player) => {
            const opponent = getOpponent(game, player.id!);
            const symbol = getSymbolEmoji(player.symbol);
            const isTurn = game.currentTurn === game.players.indexOf(player);
            const turnText = isTurn ? MESSAGES.YOUR_TURN : MESSAGES.WAITING_FOR_OPPONENT;
            const stats = opponent?.id ? await getStatsText(player.id!, opponent.id) : "";
            const base = MESSAGES.REMATCH_STARTED_FULL(opponent?.username, symbol, turnText);
            const fullMessage = `${stats}\n\n${base}`;

            return bot.api
                .editMessageText(player.chatId!, player.messageId!, fullMessage, {
                    reply_markup: keyboard,
                })
                .catch((e) =>
                    logger.error(`Failed to update rematch board for player ${player.id}:`, e)
                );
        });

    await Promise.all(updatePromises);
}
