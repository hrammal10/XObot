import { Cell, PlayerSymbol, Game } from "./types";

export function createEmptyBoard(rows: number, cols: number) {
    return new Array(rows).fill(null).map(() => Array(cols).fill(null));
}

export function checkWinner(board: Cell[][], row: number, col: number): PlayerSymbol | null {
    const player = board[row][col];
    if (!player) return null;
    const size = board.length;
    if (board[row].every((cell) => cell === player)) return player;
    if (board.every((r) => r[col] === player)) return player;
    if (row === col && board.every((r, i) => r[i] === player)) return player;
    if (row + col === size - 1 && board.every((r, i) => r[size - 1 - i] === player)) return player;
    return null;
}

export function checkDraw(board: Cell[][]) {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            if (board[i][j] === null) {
                return false;
            }
        }
    }
    return true;
}

export function isCellEmpty(board: Cell[][], row: number, col: number) {
    return board[row][col] === null;
}

export function makeMove(board: Cell[][], row: number, col: number, player: PlayerSymbol) {
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = player;
    return newBoard;
}

export function getEmptyPositions(board: Cell[][]) {
    const emptyPositionsIndices: [number, number][] = [];
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            if (board[i][j] === null) {
                emptyPositionsIndices.push([i, j]);
            }
        }
    }
    return emptyPositionsIndices;
}

export function getBotMove(
    board: Cell[][],
    difficulty: "easy" | "hard",
    botSymbol: PlayerSymbol
): [number, number] {
    if (difficulty === "easy") {
        const emptyPos = getEmptyPositions(board);
        const botPick = Math.floor(Math.random() * emptyPos.length);
        return emptyPos[botPick];
    } else {
        return findBestMove(board, botSymbol);
    }
}

export function switchTurn(currentTurn: PlayerSymbol) {
    return currentTurn === "X" ? "O" : "X";
}

export function isPlayerTurn(game: Game, userId: number): boolean {
    const currentPlayer = game.players[game.currentTurn];
    return userId === currentPlayer.id;
}

function evaluateBoard(
    board: Cell[][],
    botSymbol: PlayerSymbol,
    lastRow: number,
    lastCol: number,
    depth: number
): number {
    const winner = checkWinner(board, lastRow, lastCol);
    if (winner === botSymbol) {
        return 10 - depth;
    } else if (winner !== null) {
        return depth - 10;
    }
    return 0;
}

// minimax algorithm that determines recurses through all possible simulations of bot decisions
// added depth to minimax to pick the cell that produces a win with the least amount of moves possible
// EXPLANATION: for anyone reading this and doesn't understand depth, think about the current state of the board as a parent node and whatever cell the bot picks as a node branching from it
// the bot will simulate every single possible cell decision it could take and it will see how many moves it will take to win (simulating opponent's decision as well)
// and "depth" here will represent the how "deep" we are into the tree, and then the bot will ultimately pick the path from the parent node (current state of board) to the node 
// representing the winning board 

function minimax(
    board: Cell[][],
    isMaximizing: boolean,
    botSymbol: PlayerSymbol,
    lastRow: number,
    lastCol: number,
    depth: number
): number {
    const winner = checkWinner(board, lastRow, lastCol);
    if (winner) {
        return evaluateBoard(board, botSymbol, lastRow, lastCol, depth);
    }
    if (checkDraw(board)) return 0;
    const humanSymbol = botSymbol === "X" ? "O" : "X";
    if (isMaximizing) {
        let bestScore = -Infinity;
        const emptyPos = getEmptyPositions(board);
        for (const positions of emptyPos) {
            const [r, c] = positions;
            const newBoard = makeMove(board, r, c, botSymbol);
            const score = minimax(newBoard, false, botSymbol, r, c, depth + 1);
            bestScore = Math.max(bestScore, score);
        }
        return bestScore;
    } else {
        let bestScore = +Infinity;
        const emptyPos = getEmptyPositions(board);
        for (const positions of emptyPos) {
            const [r, c] = positions;
            const newBoard = makeMove(board, r, c, humanSymbol);
            const score = minimax(newBoard, true, botSymbol, r, c, depth + 1);
            bestScore = Math.min(bestScore, score);
        }
        return bestScore;
    }
}

// depending on the minimax algorithm, we find the best move for the bot to make
function findBestMove(board: Cell[][], botSymbol: PlayerSymbol): [number, number] {
    let bestScore = -Infinity;
    let bestPosition: [number, number] = [-1, -1];
    const emptyPos = getEmptyPositions(board);
    for (const position of emptyPos) {
        const [r, c] = position;
        const newBoard = makeMove(board, r, c, botSymbol);
        const score = minimax(newBoard, false, botSymbol, r, c, 0);
        if (score > bestScore) {
            bestScore = score;
            bestPosition = [r, c];
        }
    }
    return bestPosition;
}
