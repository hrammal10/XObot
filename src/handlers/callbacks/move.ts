import { CallbackQueryContext, Context, Bot, InlineKeyboard } from "grammy";
import { GameStatus, Game, Cell, Player } from "../../game/types";
import { MESSAGES } from "../../constants/userMessages";
import { getSymbolEmoji } from "../../constants/symbols";
import { getGame, updateGame } from "../../game/gameManager";
import { getPlayerById, getOpponent, getNextTurnIndex } from "../../utils/playerUtils";
import {
    isCellEmpty,
    makeMove,
    checkWinner,
    checkDraw,
    getBotMove,
    isPlayerTurn,
} from "../../game/gameLogic";
import { buildGameKeyboard } from "../../ui/keyboard";
import { CALLBACK_PREFIXES } from "../../constants/callback";
import { BUTTON_LABELS } from "../../constants/buttons";
import {
    initPlayer,
    saveGame,
    updateHeadToHeadStats,
    updateLeaderboard,
} from "../../solana";
import { formatPvPMessage } from "../../utils/messageFormatters";
import logger from "../../utils/logger";

interface MoveResult {
    updatedState: {
        board: Cell[][];
        status: GameStatus;
        winner: number | undefined;
        currentTurn: number;
    };
    statusText: string;
    board: Cell[][];
    status: GameStatus;
    winner: number | undefined;
}

export async function moveCallback(ctx: CallbackQueryContext<Context>, bot: Bot) {
    const { gameId, row, col } = parseMoveData(ctx.callbackQuery.data);
    const game = getGame(gameId);

    if (!game) {
        return notify(ctx, MESSAGES.GAME_NOT_FOUND);
    }
    if (!isGameActive(game)) {
        return notify(ctx, MESSAGES.GAME_ALREADY_ENDED);
    }
    const userId = ctx.from.id;
    if (!isPlayerTurn(game, userId)) {
        return notify(ctx, MESSAGES.NOT_YOUR_TURN);
    }
    if (!isCellEmpty(game.board, row, col)) {
        return notify(ctx, MESSAGES.CELL_TAKEN);
    }

    const result = applyPlayerMove(game, row, col, userId);
    updateGame(gameId, result.updatedState);
    await handlePostMove(ctx, bot, gameId, result);
    return ctx.answerCallbackQuery();
}

function parseMoveData(data: string) {
    const [, gameId, r, c] = data.split(":");
    return { gameId, row: Number(r), col: Number(c) };
}

function notify(ctx: CallbackQueryContext<Context>, text: string) {
    return ctx.answerCallbackQuery({ text, show_alert: true });
}

function isGameActive(game: Game): boolean {
    return game.status === "playing";
}

function applyPlayerMove(game: Game, row: number, col: number, userId: number): MoveResult {
    const currentPlayer = game.players[game.currentTurn];
    let board = makeMove(game.board, row, col, currentPlayer.symbol);
    let status: GameStatus = game.status;
    let winner: number | undefined = undefined;
    let turnIndex = getNextTurnIndex(game);
    let statusText = "";
    const immediateWinner = checkWinner(board, row, col);
    if (immediateWinner) {
        status = "won";
        winner = currentPlayer.id!;
        statusText = game.mode === "pve" ? MESSAGES.YOU_WIN : MESSAGES.SYMBOL_WINS(immediateWinner);
    } else if (checkDraw(board)) {
        status = "draw";
        statusText = MESSAGES.DRAW;
    } else if (game.mode === "pve") {
        const botResult = applyBotMove(game, board, turnIndex, userId);
        board = botResult.board;
        status = botResult.status as GameStatus;
        winner = botResult.winner;
        turnIndex = botResult.turnIndex;
        statusText = botResult.statusText;
    } else {
        const nextPlayer = game.players[turnIndex];
        statusText = MESSAGES.WAITING_FOR_SYMBOL(nextPlayer.symbol);
    }
    return {
        updatedState: { board, status, winner, currentTurn: turnIndex },
        statusText,
        board,
        status,
        winner,
    };
}

function applyBotMove(game: Game, board: Cell[][], turnIndex: number, userId: number) {
    const bot = game.players.find((p) => p.id === null);

    if (!bot) return { board, status: game.status, winner: undefined, turnIndex, statusText: "" };

    const [r, c] = getBotMove(board, game.difficulty!, bot.symbol);
    board = makeMove(board, r, c, bot.symbol);
    const botWinner = checkWinner(board, r, c);
    if (botWinner) {
        return {
            board,
            status: "won",
            winner: bot.id!,
            turnIndex,
            statusText: MESSAGES.MASTER_WINS,
        };
    }
    if (checkDraw(board)) {
        return {
            board,
            status: "draw",
            winner: undefined,
            turnIndex,
            statusText: MESSAGES.DRAW,
        };
    }
    const userPlayer = getPlayerById(game, userId)!;
    return {
        board,
        status: "playing" as GameStatus,
        winner: undefined,
        turnIndex,
        statusText: MESSAGES.YOUR_TURN_WITH_SYMBOL(getSymbolEmoji(userPlayer.symbol)),
    };
}

async function handlePostMove(
    ctx: CallbackQueryContext<Context>,
    bot: Bot,
    gameId: string,
    result: MoveResult
): Promise<void> {
    const { board, status, winner, statusText } = result;
    const game = getGame(gameId)!;
    const keyboard = buildGameKeyboard(board, gameId);
    if (status === "won" || status === "draw") {
        addRematchButton(keyboard, game);
        await handleGameCompletion(game, board, winner ?? null, status);
    } else if (game.mode === "pve") {
        keyboard.row();
        keyboard.text(BUTTON_LABELS.RETURN, `${CALLBACK_PREFIXES.RETURN}${gameId}`);
    }
    if (game.mode === "pve") {
        await ctx.editMessageText(statusText, { reply_markup: keyboard });
        return;
    }
    await updatePvPMessages(bot, gameId, statusText, keyboard);
}

function addRematchButton(keyboard: InlineKeyboard, game: Game): void {
    keyboard.row();
    const count = game.mode === "pve" ? 1 : game.rematchCount;
    keyboard.text(BUTTON_LABELS.REMATCH(count, 2), `${CALLBACK_PREFIXES.REMATCH}${game.id}`);
    if (game.mode === "pve") {
        keyboard.row();
        keyboard.text(BUTTON_LABELS.RETURN, `${CALLBACK_PREFIXES.RETURN}${game.id}`);
    }
}

async function handleGameCompletion(
    game: Game,
    board: Cell[][],
    winner: number | null,
    status: "won" | "draw"
): Promise<void> {
    if (game.mode !== "pvp") return;

    const p1 = game.players[0];
    const p2 = game.players[1];
    const boardState = board.map((row) => row.join(",")).join(";");

    try {
        await Promise.all([
            initPlayer(p1.id!, p1.username ?? "unknown"),
            initPlayer(p2.id!, p2.username ?? "unknown"),
        ]);

        await saveGame({
            gameMode: game.mode,
            boardState,
            winnerTelegramId: winner,
            status,
            player1TelegramId: p1.id!,
            player2TelegramId: p2.id!,
            player1Symbol: p1.symbol,
            player2Symbol: p2.symbol,
            player1IsWinner: p1.id === winner,
            player2IsWinner: p2.id === winner,
        });

        const h2hResult =
            winner === null ? "draw" : winner === p1.id ? "player1_win" : "player2_win";
        await updateHeadToHeadStats(
            p1.id!,
            p2.id!,
            h2hResult as "player1_win" | "player2_win" | "draw"
        );

        if (status === "draw") {
            await Promise.all([
                updateLeaderboard(p1.id!, p1.username ?? "unknown", "draw"),
                updateLeaderboard(p2.id!, p2.username ?? "unknown", "draw"),
            ]);
        } else {
            const winnerId = winner!;
            const loserId = winnerId === p1.id ? p2.id! : p1.id!;
            const winnerUsername =
                winnerId === p1.id ? (p1.username ?? "unknown") : (p2.username ?? "unknown");
            const loserUsername =
                loserId === p1.id ? (p1.username ?? "unknown") : (p2.username ?? "unknown");
            await Promise.all([
                updateLeaderboard(winnerId, winnerUsername, "win"),
                updateLeaderboard(loserId, loserUsername, "loss"),
            ]);
        }
    } catch (e) {
        logger.error("Failed to save game to Solana:", e);
    }
}

async function updatePvPMessages(
    bot: Bot,
    gameId: string,
    statusText: string,
    keyboard: InlineKeyboard
): Promise<void> {
    const updatedGame = getGame(gameId);
    if (!updatedGame) {
        return;
    }

    const validPlayers = updatedGame.players.filter(
        (player): player is Player & { id: number; chatId: number; messageId: number } =>
            player.chatId !== undefined &&
            player.messageId !== undefined &&
            player.id !== null &&
            player.id !== undefined
    );

    const updatePromises = validPlayers.map(async (player) => {
        const opponent = getOpponent(updatedGame, player.id);
        const opponentText = opponent ? `vs @${opponent.username}\n` : "";
        const baseStatus = `${opponentText}${statusText}`;
        const fullMessage = await formatPvPMessage(updatedGame, player.id, baseStatus);

        return bot.api
            .editMessageText(player.chatId, player.messageId, fullMessage, {
                reply_markup: keyboard,
            })
            .catch((e) => logger.error(`Failed to update board for player ${player.id}:`, e));
    });

    await Promise.all(updatePromises);
}
