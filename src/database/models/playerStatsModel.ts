import { pool } from '../connection';

export interface PlayerStats {
    id: number;
    player1_telegram_id: number;
    player2_telegram_id: number;
    player1_wins: number;
    player2_wins: number;
    draws: number;
    total_games: number;
    last_played: Date;
}

export async function getHeadToHeadStats(player1Id: number, player2Id: number): Promise<PlayerStats | null> {
    const minId = Math.min(player1Id, player2Id);
    const maxId = Math.max(player1Id, player2Id);
    
    const result = await pool.query(
        'SELECT * FROM player_stats WHERE player1_telegram_id = $1 AND player2_telegram_id = $2',
        [minId, maxId]
    );
    
    return result.rows[0] || null;
}

export async function updatePlayerStats(
    player1Id: number,
    player2Id: number,
    winnerId: number | null
): Promise<void> {
    if (player1Id === player2Id) {
        console.warn("⚠️ Skipping stats update: same player on both sides");
        return;
    }
    
    const minId = Math.min(player1Id, player2Id);
    const maxId = Math.max(player1Id, player2Id);
    
    const existing = await getHeadToHeadStats(player1Id, player2Id);
    
    if (existing) {
        let player1Wins = existing.player1_wins;
        let player2Wins = existing.player2_wins;
        let draws = existing.draws;
        
        if (winnerId === null) {
            draws++;
        } else if (winnerId === minId) {
            player1Wins++;
        } else if (winnerId === maxId) {
            player2Wins++;
        }
        
        await pool.query(
            `UPDATE player_stats 
             SET player1_wins = $1, player2_wins = $2, draws = $3, total_games = total_games + 1, last_played = NOW()
             WHERE player1_telegram_id = $4 AND player2_telegram_id = $5`,
            [player1Wins, player2Wins, draws, minId, maxId]
        );
    } else {
        let player1Wins = 0;
        let player2Wins = 0;
        let draws = 0;
        
        if (winnerId === null) {
            draws = 1;
        } else if (winnerId === minId) {
            player1Wins = 1;
        } else if (winnerId === maxId) {
            player2Wins = 1;
        }
        
        await pool.query(
            `INSERT INTO player_stats (player1_telegram_id, player2_telegram_id, player1_wins, player2_wins, draws, total_games)
             VALUES ($1, $2, $3, $4, $5, 1)`,
            [minId, maxId, player1Wins, player2Wins, draws]
        );
    }
}