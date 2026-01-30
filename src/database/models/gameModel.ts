import { pool } from '../connection';
import { Cell } from '../../game/types';

export interface GamePlayer {
    telegramId: number;
    symbol: 'X' | 'O';
    isWinner: boolean;
}

export async function saveCompletedGame(
    gameMode: 'pve' | 'pvp',
    boardState: Cell[][],
    winnerTelegramId: number | null,
    status: 'won' | 'draw',
    players: GamePlayer[]
): Promise<number> {
    if (players.length === 0) {
        console.warn("⚠️ Skipping game save: no players");
        return -1;
    }
    
    const boardJson = JSON.stringify(boardState);
    
    const gameResult = await pool.query(
        'INSERT INTO games (game_mode, board_state, winner_telegram_id, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [gameMode, boardJson, winnerTelegramId, status]
    );
    const gameId = gameResult.rows[0].id;
    
    for (const player of players) {
        await pool.query(
            'INSERT INTO game_players (game_id, player_telegram_id, symbol, is_winner) VALUES ($1, $2, $3, $4)',
            [gameId, player.telegramId, player.symbol, player.isWinner]
        );
    }
    
    return gameId;
}

export async function getGameHistory(player1Id: number, player2Id: number): Promise<any[]> {
    const result = await pool.query(
        `SELECT g.*, gp.symbol, gp.is_winner 
         FROM games g
         JOIN game_players gp ON g.id = gp.game_id
         WHERE g.id IN (
             SELECT game_id FROM game_players 
             WHERE player_telegram_id = $1
             INTERSECT
             SELECT game_id FROM game_players 
             WHERE player_telegram_id = $2
         )
         ORDER BY g.completed_at DESC`,
        [player1Id, player2Id]
    );
    return result.rows;
}
