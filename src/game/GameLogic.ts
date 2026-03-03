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

    const isSquare = board.length === board[0].length;
    const isOnMainDiagonal = isSquare && row === col;
    const isOnAntiDiagonal = isSquare && row + col === board.length - 1;

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

// Minimax with alpha-beta pruning.
// "depth" represents how deep we are into the game tree from the current board state.
// Alpha tracks the best score the maximizer can guarantee; beta tracks the best the
// minimizer can guarantee. When beta <= alpha we prune (skip remaining siblings),
// producing the same result as full minimax but much faster.
// MAX_DEPTH caps exploration so larger boards don't hang.

const MAX_DEPTH = 9;

function minimax(
    board: Cell[][],
    isMaximizing: boolean,
    botSymbol: PlayerSymbol,
    lastRow: number,
    lastCol: number,
    depth: number,
    alpha: number,
    beta: number
): number {
    const winner = checkWinner(board, lastRow, lastCol);
    if (winner) {
        return evaluateBoard(board, botSymbol, lastRow, lastCol, depth);
    }
    if (checkDraw(board)) {
        return 0;
    }
    if (depth >= MAX_DEPTH) {
        return 0;
    }

    const emptyPos = getEmptyPositions(board);
    const symbol = isMaximizing ? botSymbol : botSymbol === "X" ? "O" : "X";

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const [r, c] of emptyPos) {
            const newBoard = makeMove(board, r, c, symbol);
            const score = minimax(newBoard, false, botSymbol, r, c, depth + 1, alpha, beta);
            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (const [r, c] of emptyPos) {
            const newBoard = makeMove(board, r, c, symbol);
            const score = minimax(newBoard, true, botSymbol, r, c, depth + 1, alpha, beta);
            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return minScore;
    }
}

function findBestMove(board: Cell[][], botSymbol: PlayerSymbol): [number, number] {
    const emptyPos = getEmptyPositions(board);
    if (emptyPos.length === 0) {
        return [-1, -1];
    }

    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;
    let bestPosition: [number, number] = [-1, -1];
    for (const [r, c] of emptyPos) {
        const newBoard = makeMove(board, r, c, botSymbol);
        const score = minimax(newBoard, false, botSymbol, r, c, 0, alpha, beta);
        if (score > bestScore) {
            bestScore = score;
            bestPosition = [r, c];
        }
        alpha = Math.max(alpha, score);
    }
    return bestPosition;
}
