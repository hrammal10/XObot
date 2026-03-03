import { CallbackQueryContext, Context, Bot } from "grammy";
import { MESSAGES } from "../../constants/userMessages";
import { getSymbolEmoji } from "../../constants/symbols";
import { BOARD } from "../../constants/gameConfig";
import { createGame, updateGame } from "../../game/gameManager";
import { extractUser, getPlayerById, getNextTurnIndex } from "../../utils/playerUtils";
import { getBotMove, makeMove } from "../../game/gameLogic";
import { buildGameKeyboard } from "../../ui/keyboard";
import { CALLBACK_PREFIXES } from "../../constants/callback";
import { BUTTON_LABELS } from "../../constants/buttons";
import { Game, Cell } from "../../game/types";

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
    if (!difficulty) {
        await ctx.answerCallbackQuery({ text: MESSAGES.UNEXPECTED_ERROR, show_alert: true });
        return;
    }
    const game = createPvEGame(
        { id: user.id, chatId: user.chatId, username: user.username },
        difficulty
    );
    if (!game) {
        return;
    }
    const { boardToShow, currentTurn } = computeInitialBoard(game);
    const keyboard = buildGameKeyboard(boardToShow, game.id);
    keyboard.row();
    keyboard.text(BUTTON_LABELS.RETURN, `${CALLBACK_PREFIXES.RETURN}${game.id}`);

    const userPlayer = getPlayerById(game, user.id);
    if (!userPlayer) {
        await ctx.answerCallbackQuery({ text: MESSAGES.GAME_CREATION_FAILED, show_alert: true });
        return;
    }
    const userSymbol = getSymbolEmoji(userPlayer.symbol);

    await ctx.editMessageText(MESSAGES.YOU_ARE_SYMBOL(userSymbol), {
        reply_markup: keyboard,
    });

    updateGameState(game, boardToShow, currentTurn, user.id, ctx.msgId!);
    await ctx.answerCallbackQuery();
}

const VALID_DIFFICULTIES = new Set<string>(["easy", "hard"]);

function extractDifficulty(data: string): "easy" | "hard" | null {
    const value = data.slice(CALLBACK_PREFIXES.DIFFICULTY.length);
    return VALID_DIFFICULTIES.has(value) ? (value as "easy" | "hard") : null;
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
    const [r, c] = getBotMove(game.board, game.difficulty ?? "easy", "X");
    if (r === -1 || c === -1) {
        return { boardToShow: game.board, currentTurn: game.currentTurn };
    }
    const updatedBoard = makeMove(game.board, r, c, "X");
    const nextTurn = getNextTurnIndex({ ...game, currentTurn: game.currentTurn });
    return {
        boardToShow: updatedBoard,
        currentTurn: nextTurn,
    };
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
