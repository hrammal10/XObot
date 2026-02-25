import "dotenv/config";
import { getLeaderboard, getPlayerHistory, getHeadToHeadStats } from "./client";
import logger from "../utils/logger";

const [command, ...args] = process.argv.slice(2);

async function main(): Promise<void> {
    switch (command) {
        case "leaderboard": {
            const entries = await getLeaderboard();
            if (entries.length === 0) {
                logger.info("No leaderboard entries yet.");
                return;
            }
            logger.info("🏆 Leaderboard:");
            entries.forEach((e, i) => {
                logger.info(
                    `${i + 1}. ${e.username} — W:${e.totalWins} L:${e.totalLosses} D:${e.totalDraws}`
                );
            });
            break;
        }

        case "history": {
            const telegramId = Number(args[0]);
            if (!telegramId) {
                logger.warn("Usage: npm run inspect -- history <telegramId>");
                return;
            }
            const games = await getPlayerHistory(telegramId);
            if (games.length === 0) {
                logger.info(`No games found for player ${telegramId}.`);
                return;
            }
            logger.info(`📜 Game history for ${telegramId}:`);
            games.forEach((g, i) => {
                logger.info(
                    `${i + 1}. ${g.gameMode} | ${g.status} | P1:${g.player1TelegramId} (${g.player1Symbol}) vs P2:${g.player2TelegramId} (${g.player2Symbol}) | Winner: ${g.winnerTelegramId ?? "draw"}`
                );
                logger.info(`   Board: ${g.boardState}`);
            });
            break;
        }

        case "h2h": {
            const id1 = Number(args[0]);
            const id2 = Number(args[1]);
            if (!id1 || !id2) {
                logger.warn("Usage: npm run inspect -- h2h <id1> <id2>");
                return;
            }
            const stats = await getHeadToHeadStats(id1, id2);
            if (!stats) {
                logger.info(`No head-to-head stats between ${id1} and ${id2}.`);
                return;
            }
            logger.info(`⚔️ Head-to-Head: ${id1} vs ${id2}`);
            logger.info(`Player 1 wins: ${stats.player1Wins}`);
            logger.info(`Player 2 wins: ${stats.player2Wins}`);
            logger.info(`Draws: ${stats.draws}`);
            logger.info(`Total games: ${stats.totalGames}`);
            break;
        }

        default:
            logger.info("Commands:");
            logger.info("  npm run inspect -- leaderboard");
            logger.info("  npm run inspect -- history <telegramId>");
            logger.info("  npm run inspect -- h2h <id1> <id2>");
    }
}

main().catch((e) => logger.error("Inspect failed:", e));
