import { Cell, PlayerSymbol, GameStatus, Game } from "./types";

export function createEmptyBoard() {
    return new Array(9).fill(null);
}

export function checkWinner(board: Cell[]) {
    const winningCombinations = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ]
    for (const combination of winningCombinations) {
        if (board[combination[0]] != null) {
            if (board[combination[0]] === board[combination[1]] && board[combination[0]] === board[combination[2]]) {
                return board[combination[0]]
            }
        }
    }
    return null
}

export function checkDraw(board: Cell[]) {
    for (const cell of board) {
        if (cell === null) {
            return false
        }
    }
    if (checkWinner(board) != null) {
        return false
    }
    else return true;
}

export function isCellEmpty(board: Cell[], position: number) {
    return board[position] === null
}

export function makeMove(board: Cell[], position: number, player: PlayerSymbol) {
    const newBoard = board.slice();
    newBoard[position] = player
    return newBoard
}

export function getEmptyPositions(board: Cell[]) {
    let emptyPositionsIndices: number[] = []
    for (let i = 0; i < board.length; i++) {
        if (board[i] == null) {
            emptyPositionsIndices.push(i)
        }
    }
    return emptyPositionsIndices
}

export function getBotMove(board: Cell[], difficulty: "easy" | "hard", botSymbol: PlayerSymbol): number {
    if (difficulty === "easy") {
        let emptyPos = getEmptyPositions(board)
        const botPick = Math.floor(Math.random() * emptyPos.length)
        return emptyPos[botPick]
    } else {
        return findBestMove(board, botSymbol)
    }
}

export function switchTurn(currentTurn: PlayerSymbol) {
    return (currentTurn === "X") ? "O" : "X"
}

export function isPlayerTurn(game: Game, userId: number): boolean {
    if (game.currentTurn === "X") {
        return userId === game.playerX;
    } else {
        return userId === game.playerO;
    }
}

function evaluateBoard(board: Cell[], botSymbol: PlayerSymbol): number {
    const winner = checkWinner(board);
    if (winner === botSymbol) {
        return 10;
    } else if (winner !== null) {
        return -10;
    }
    return 0;
}

// minimax algorithm that determines recurses through all possible simulations of bot decisions
function minimax(board: Cell[], isMaximizing: boolean, botSymbol: PlayerSymbol): number {
    const winner = checkWinner(board);
    if (winner) {
        return evaluateBoard(board, botSymbol);
    }
    if (checkDraw(board)) {
        return 0;
    }
    const humanSymbol = botSymbol === "X" ? "O" : "X";
    if (isMaximizing) {
        let bestScore = -Infinity
        let emptyPos = getEmptyPositions(board)
        for (const positions of emptyPos) {
            const newBoard = makeMove(board, positions, botSymbol)
            const score = minimax(newBoard, false, botSymbol)
            bestScore = Math.max(bestScore, score);
        }
        return bestScore;
    } else {
        let bestScore = +Infinity
        let emptyPos = getEmptyPositions(board)
        for (const positions of emptyPos) {
            const newBoard = makeMove(board, positions, humanSymbol)
            const score = minimax(newBoard, true, botSymbol)
            bestScore = Math.min(bestScore, score);
        }
        return bestScore;
    }
}


// depending on the minimax algorithm, we find the best move for the bot to make
function findBestMove(board: Cell[], botSymbol: PlayerSymbol): number {
    let bestScore = -Infinity
    let bestPosition = -1
    const emptyPos = getEmptyPositions(board);

    for (const position of emptyPos) {
        const newBoard = makeMove(board, position, botSymbol)
        const score = minimax(newBoard, false, botSymbol)
        if (score > bestScore) {
            bestScore = score;
            bestPosition = position;
        }
    }
    return bestPosition
}