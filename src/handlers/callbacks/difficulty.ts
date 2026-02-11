import { CallbackQueryContext, Context, Bot, InlineKeyboard } from "grammy";
import { MESSAGES } from "../../constants/userMessages";
import { getSymbolEmoji } from "../../constants/symbols";
import { BOARD } from "../../constants/gameConfig";
import { createGame, updateGame } from "../../game/gameManager";
import { getPlayerById, getNextTurnIndex } from "../../utils/playerUtils";
import { getBotMove, makeMove } from "../../game/gameLogic";
import { buildGameKeyboard } from "../../ui/keyboard";
import { CALLBACK_PREFIXES } from "../../constants/callback";
import { Game, Cell, Player } from "../../game/types";

export async function difficultyCallback(
    ctx: CallbackQueryContext<Context>,
    bot: Bot
): Promise<void> {
    if (!ctx.from) {
        await ctx.answerCallbackQuery({
            text: MESSAGES.USER_NOT_IDENTIFIED,
            show_alert: true,
        });
        return;
    }

    const user = extractUser(ctx);
    if (!user.chatId) {
        await ctx.answerCallbackQuery({
            text: MESSAGES.CHAT_NOT_FOUND,
            show_alert: true,
        });
        return;
    }

    const difficulty = extractDifficulty(ctx.callbackQuery.data);
    const game = createPvEGame(
        { id: user.id, chatId: user.chatId, username: user.username },
        difficulty
    );
    const { boardToShow, currentTurn } = computeInitialBoard(game);
    const keyboard = buildGameKeyboard(boardToShow, game.id);
    const userSymbol = getSymbolEmoji(getPlayerById(game, user.id)!.symbol);
    const message = await sendDifficultyMessage(ctx, userSymbol, keyboard);
    updateGameState(game, boardToShow, currentTurn, user.id, message.message_id);
    await ctx.answerCallbackQuery();
}

function extractUser(ctx: CallbackQueryContext<Context>) {
    return {
        id: ctx.from!.id,
        chatId: ctx.chat?.id,
        username: ctx.from!.username,
    };
}

function extractDifficulty(data: string): "easy" | "hard" {
    return data.slice(CALLBACK_PREFIXES.DIFFICULTY.length) as "easy" | "hard";
}

function createPvEGame(
    user: { id: number; chatId: number; username?: string },
    difficulty: "easy" | "hard"
) {
    return createGame(user.id, user.chatId, "pve", BOARD.ROWS, BOARD.COLS, difficulty);
}

function computeInitialBoard(game: Game): { boardToShow: Cell[][]; currentTurn: number } {
    const bot = game.players.find((p) => p.id === null);
    if (!bot || bot.symbol !== "X") {
        return {
            boardToShow: game.board,
            currentTurn: game.currentTurn,
        };
    }
    const [r, c] = getBotMove(game.board, game.difficulty!, "X");
    const updatedBoard = makeMove(game.board, r, c, "X");
    const nextTurn = getNextTurnIndex({ ...game, currentTurn: game.currentTurn });
    return {
        boardToShow: updatedBoard,
        currentTurn: nextTurn,
    };
}

async function sendDifficultyMessage(
    ctx: CallbackQueryContext<Context>,
    symbol: string,
    keyboard: InlineKeyboard
) {
    return ctx.reply(MESSAGES.YOU_ARE_SYMBOL(symbol), {
        reply_markup: keyboard,
    });
}

function updateGameState(
    game: Game,
    board: Cell[][],
    currentTurn: number,
    userId: number,
    messageId: number
): void {
    const updatedPlayers = game.players.map((p) => (p.id === userId ? { ...p, messageId } : p));
    updateGame(game.id, {
        board,
        currentTurn,
        players: updatedPlayers,
    });
}
