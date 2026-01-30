import { InlineKeyboard } from "grammy";
import { Cell } from "../game/types";
import { CALLBACK_PREFIXES } from "../constants/callback";
import { BOARD } from "../constants/gameConfig";

export function buildGameKeyboard(board: Cell[][], gameId: string): InlineKeyboard {
    const matrix = new InlineKeyboard();
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            let displayText;
            if (board[r][c] === "X") displayText = BOARD.X_CELL_EMOJI;
            else if (board[r][c] === "O") displayText = BOARD.O_CELL_EMOJI;
            else displayText = BOARD.EMPTY_CELL_EMOJI;
            const callBackData = `${CALLBACK_PREFIXES.MOVE}${gameId}:${r}:${c}`;
            matrix.text(displayText, callBackData);
        }
        matrix.row();
    }
    return matrix;
}
