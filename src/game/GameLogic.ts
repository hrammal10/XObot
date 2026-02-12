import { Cell, PlayerSymbol, Game } from "./types";

export function createEmptyBoard(rows: number, cols: number) {
    return new Array(rows).fill(null).map(() => Array(cols).fill(null));
}

function checkRow(board: Cell[][], row: number, player: PlayerSymbol): boolean {
    return board[row].every((cell) => cell === player);
}

function checkColumn(board: Cell[][], col: number, player: PlayerSymbol): boolean {
    return board.every((row) => row[col] === player);
}

function checkMainDiagonal(board: Cell[][], player: PlayerSymbol): boolean {
    return board.every((row, i) => row[i] === player);
}

function checkAntiDiagonal(board: Cell[][], player: PlayerSymbol): boolean {
    const size = board.length;
    return board.every((row, i) => row[size - 1 - i] === player);
}

export function checkWinner(board: Cell[][], row: number, col: number): PlayerSymbol | null {
    if (!board || board.length === 0) {
        return null;
    }
    if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
        return null;
    }

    const player = board[row][col];
    if (!player) return null;

    const size = board.length;
    const isOnMainDiagonal = row === col;
    const isOnAntiDiagonal = row + col === size - 1;

    if (checkRow(board, row, player)) {
        return player;
    }
    if (checkColumn(board, col, player)) {
        return player;
    }
    if (isOnMainDiagonal && checkMainDiagonal(board, player)) {
        return player;
    }
    if (isOnAntiDiagonal && checkAntiDiagonal(board, player)) {
        return player;
    }

    return null;
}

export function checkDraw(board: Cell[][]): boolean {
    if (!board || board.length === 0) {
        return false;
    }
    return board.every((row) => row.every((cell) => cell !== null));
}

export function isCellEmpty(board: Cell[][], row: number, col: number): boolean {
    if (!board || board.length === 0) {
        return false;
    }
    if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
        return false;
    }
    return board[row][col] === null;
}

export function makeMove(
    board: Cell[][],
    row: number,
    col: number,
    player: PlayerSymbol
): Cell[][] {
    if (!board || board.length === 0) {
        return board;
    }
    if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
        return board;
    }
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = player;
    return newBoard;
}

export function getEmptyPositions(board: Cell[][]): [number, number][] {
    if (!board || board.length === 0) {
        return [];
    }
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
    const emptyPos = getEmptyPositions(board);
    if (emptyPos.length === 0) {
        return [-1, -1];
    }

    if (difficulty === "easy") {
        const botPick = Math.floor(Math.random() * emptyPos.length);
        return emptyPos[botPick];
    }
    return findBestMove(board, botSymbol);
}

export function switchTurn(currentTurn: PlayerSymbol) {
    return currentTurn === "X" ? "O" : "X";
}

export function isPlayerTurn(game: Game, userId: number): boolean {
    if (!game || !game.players || game.players.length === 0) {
        return false;
    }
    if (game.currentTurn < 0 || game.currentTurn >= game.players.length) {
        return false;
    }
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
    if (checkDraw(board)) {
        return 0;
    }

    const emptyPos = getEmptyPositions(board);
    const symbol = isMaximizing ? botSymbol : botSymbol === "X" ? "O" : "X";
    const scores = emptyPos.map(([r, c]) => {
        const newBoard = makeMove(board, r, c, symbol);
        return minimax(newBoard, !isMaximizing, botSymbol, r, c, depth + 1);
    });

    return isMaximizing ? Math.max(...scores) : Math.min(...scores);
}

// depending on the minimax algorithm, we find the best move for the bot to make
function findBestMove(board: Cell[][], botSymbol: PlayerSymbol): [number, number] {
    const emptyPos = getEmptyPositions(board);
    if (emptyPos.length === 0) {
        return [-1, -1];
    }

    let bestScore = -Infinity;
    let bestPosition: [number, number] = [-1, -1];
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
