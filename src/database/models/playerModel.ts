import { pool } from "../connection";

export interface PlayerDB {
    id: number;
    telegram_id: number;
    username?: string;
    created_at: Date;
}

const queries = {
    FIND_PLAYER: `
        SELECT * FROM players WHERE telegram_id = $1
    `,
    UPDATE_USERNAME: `
        UPDATE players SET username = $1 WHERE telegram_id = $2 RETURNING *
    `,
    INSERT_PLAYER: `
        INSERT INTO players (telegram_id, username)
        VALUES ($1, $2)
        RETURNING *
    `
};

export async function createOrGetPlayer(
    telegramId: number,
    username?: string
): Promise<PlayerDB> {
    const existing = await findPlayer(telegramId);
    if (existing) {
        return syncUsername(existing, username);
    }
    return insertNewPlayer(telegramId, username);
}

export async function getPlayerById(
    telegramId: number
): Promise<PlayerDB | null> {
    return findPlayer(telegramId);
}

async function findPlayer(telegramId: number): Promise<PlayerDB | null> {
    const result = await pool.query(queries.FIND_PLAYER, [telegramId]);
    return result.rows[0] || null;
}

async function syncUsername(
    player: PlayerDB,
    newUsername?: string
): Promise<PlayerDB> {
    if (!newUsername || player.username === newUsername) {
        return player;
    }
    const result = await pool.query(queries.UPDATE_USERNAME, [
        newUsername,
        player.telegram_id
    ]);

    return result.rows[0];
}

async function insertNewPlayer(
    telegramId: number,
    username?: string
): Promise<PlayerDB> {
    const result = await pool.query(queries.INSERT_PLAYER, [telegramId, username]);
    return result.rows[0];
}
