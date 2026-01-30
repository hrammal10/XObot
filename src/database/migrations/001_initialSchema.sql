CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    game_mode VARCHAR(10) NOT NULL,
    board_state TEXT NOT NULL,
    winner_telegram_id BIGINT,
    status VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_players (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    player_telegram_id BIGINT REFERENCES players(telegram_id) ON DELETE CASCADE,
    symbol CHAR(1) NOT NULL,
    is_winner BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS player_stats (
    id SERIAL PRIMARY KEY,
    player1_telegram_id BIGINT NOT NULL,
    player2_telegram_id BIGINT NOT NULL,
    player1_wins INTEGER DEFAULT 0,
    player2_wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    last_played TIMESTAMP DEFAULT NOW(),
    UNIQUE(player1_telegram_id, player2_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_players_telegram_id ON players(telegram_id);
CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner_telegram_id);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player_id ON game_players(player_telegram_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_players ON player_stats(player1_telegram_id, player2_telegram_id);