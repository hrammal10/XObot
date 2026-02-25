use anchor_lang::prelude::*;

declare_id!("B2S6T4oowZe1iLj4LJQb9ngpJqurw58exY4kQKQ46x5j");

#[program]
pub mod xobot_program {
    use super::*;

    pub fn init_player(
        ctx: Context<InitPlayer>, 
        telegram_id: u64, 
        username: String
    ) -> Result<()> {
        let player = &mut ctx.accounts.player;
        player.telegram_id = telegram_id;
        player.username = username;
        player.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_player(
        ctx: Context<UpdatePlayer>,
        _telegram_id: u64,
        username: String,
    ) -> Result<()> {
        let player = &mut ctx.accounts.player;
        player.username = username;
        Ok(())
    }

    pub fn save_game(
        ctx: Context<SaveGame>,
        game_mode: String,
        board_state: String,
        winner_telegram_id: Option<u64>,
        status: String,
        player1_telegram_id: u64,
        player2_telegram_id: u64,
        player1_symbol: String,
        player2_symbol: String,
        player1_is_winner: bool,
        player2_is_winner: bool,
    ) -> Result<()> {
        let game_record = &mut ctx.accounts.game;
        game_record.game_mode = game_mode;
        game_record.board_state = board_state;
        game_record.winner_telegram_id = winner_telegram_id;
        game_record.status = status;
        game_record.player1_telegram_id = player1_telegram_id;
        game_record.player2_telegram_id = player2_telegram_id;
        game_record.player1_symbol = player1_symbol;
        game_record.player2_symbol = player2_symbol;
        game_record.player1_is_winner = player1_is_winner;
        game_record.player2_is_winner = player2_is_winner;
        game_record.created_at = Clock::get()?.unix_timestamp;
        game_record.completed_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_head_to_head(
        ctx: Context<UpdateHeadToHead>,
        player1_telegram_id: u64,
        player2_telegram_id: u64,
        result: String,
    ) -> Result<()> {
        let stats = &mut ctx.accounts.stats;
        
        if stats.total_games == 0 {
            stats.player1_telegram_id = player1_telegram_id;
            stats.player2_telegram_id = player2_telegram_id;
            stats.player1_wins = 0;
            stats.player2_wins = 0;
            stats.draws = 0;
            stats.total_games = 0;
        }
        
        if result == "player1_win" {
            stats.player1_wins += 1;
        } else if result == "player2_win" {
            stats.player2_wins += 1;
        } else if result == "draw" {
            stats.draws += 1;
        }
        stats.total_games += 1;
        stats.last_played = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_leaderboard(
        ctx: Context<UpdateLeaderboard>,
        _telegram_id: u64,
        username: String,
        result: String,
    ) -> Result<()> {
        let lb = &mut ctx.accounts.leaderboard;

        if lb.total_wins == 0 && lb.total_losses == 0 && lb.total_draws == 0 {
            lb.telegram_id = _telegram_id;
        }
        lb.username = username;

        if result == "win" {
            lb.total_wins += 1;
        } else if result == "loss" {
            lb.total_losses += 1;
        } else if result == "draw" {
            lb.total_draws += 1;
        }
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(telegram_id: u64)]
pub struct InitPlayer<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + PlayerAccount::INIT_SPACE,
        seeds = [b"player", telegram_id.to_le_bytes().as_ref()],
        bump
    )]
    pub player: Account<'info, PlayerAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(telegram_id: u64)]
pub struct UpdatePlayer<'info> {
    #[account(
        mut,
        seeds = [b"player", telegram_id.to_le_bytes().as_ref()],
        bump
    )]
    pub player: Account<'info, PlayerAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct SaveGame<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + GameRecord::INIT_SPACE,
    )]
    pub game: Account<'info, GameRecord>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(player1_telegram_id: u64, player2_telegram_id: u64)]
pub struct UpdateHeadToHead<'info> {
    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + HeadToHeadStats::INIT_SPACE,
        seeds = [
            b"head_to_head",
            player1_telegram_id.to_le_bytes().as_ref(),
            player2_telegram_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub stats: Account<'info, HeadToHeadStats>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(telegram_id: u64)]
pub struct UpdateLeaderboard<'info> {
    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + PlayerLeaderboard::INIT_SPACE,
        seeds = [b"leaderboard", telegram_id.to_le_bytes().as_ref()],
        bump
    )]
    pub leaderboard: Account<'info, PlayerLeaderboard>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct PlayerAccount {
    pub telegram_id: u64,
    #[max_len(32)]
    pub username: String,
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct GameRecord {
    #[max_len(10)]
    pub game_mode: String,
    #[max_len(100)]
    pub board_state: String,
    pub winner_telegram_id: Option<u64>,
    #[max_len(10)]
    pub status: String,
    pub player1_telegram_id: u64,
    pub player2_telegram_id: u64,
    #[max_len(1)]
    pub player1_symbol: String,
    #[max_len(1)]
    pub player2_symbol: String,
    pub player1_is_winner: bool,
    pub player2_is_winner: bool,
    pub created_at: i64,
    pub completed_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct HeadToHeadStats {
    pub player1_telegram_id: u64,
    pub player2_telegram_id: u64,
    pub player1_wins: u32,
    pub player2_wins: u32,
    pub draws: u32,
    pub total_games: u32,
    pub last_played: i64,
}

#[account]
#[derive(InitSpace)]
pub struct PlayerLeaderboard {
    pub telegram_id: u64,
    #[max_len(32)]
    pub username: String,
    pub total_wins: u32,
    pub total_losses: u32,
    pub total_draws: u32,
}