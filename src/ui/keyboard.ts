import { InlineKeyboard } from "grammy";
import { Cell, PlayerSymbol, GameStatus } from "../game/types";

export function buildGameKeyboard(board: Cell[], gameId: string){
    const matrix = new InlineKeyboard()
    let displayText;
    for (let i = 0; i < board.length; i++){
        if (board[i] === "X"){
            displayText = "❌";
        } else if (board[i] === "O"){
            displayText = "⭕";
        } else {
            displayText = "⬜️";
        }
        const callBackData = "move" + ":" + gameId + ":" + i
        matrix.text(displayText, callBackData)
        if ((i + 1) % 3 === 0){
            matrix.row()
        }
    }
    return matrix
}   

export function buildRematchKeyboard(gameId: string, count: number, mode: "pve" | "pvp"){
    if (mode === "pve"){
        return new InlineKeyboard()
            .text('Rematch (1/2)', `rematch:${gameId}`)
    } 
     else {
        return new InlineKeyboard()
        .text(`Rematch (${count}/2)`, `rematch:${gameId}`)
    }
}