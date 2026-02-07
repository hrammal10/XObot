import { InlineKeyboard } from "grammy";
import { Cell } from "../game/types";
import { CALLBACK_PREFIXES } from "../constants/callback";
import { BOARD } from "../constants/gameConfig";

const CELL_EMOJI_MAP: Record<NonNullable<Cell>, string> = {
    X: BOARD.X_CELL_EMOJI,
    O: BOARD.O_CELL_EMOJI,
};

function getCellEmoji(cell: Cell): string {
    return cell ? CELL_EMOJI_MAP[cell] : BOARD.EMPTY_CELL_EMOJI;
}

function buildMoveCallbackData(gameId: string, row: number, col: number): string {
    return `${CALLBACK_PREFIXES.MOVE}${gameId}:${row}:${col}`;
}

function addRowToKeyboard(
    keyboard: InlineKeyboard,
    row: Cell[],
    rowIndex: number,
    gameId: string
): void {
    row.forEach((cell, colIndex) => {
        const emoji = getCellEmoji(cell);
        const callbackData = buildMoveCallbackData(gameId, rowIndex, colIndex);
        keyboard.text(emoji, callbackData);
    });
    keyboard.row();
}

export function buildGameKeyboard(board: Cell[][], gameId: string): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    board.forEach((row, rowIndex) => addRowToKeyboard(keyboard, row, rowIndex, gameId));
    return keyboard;
}