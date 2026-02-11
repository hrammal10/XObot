import { PrismaClient, PlayerStats } from "../../generated/prisma/client";
import logger from "../../utils/logger";

const prisma = new PrismaClient();

export type { PlayerStats };

export async function getHeadToHeadStats(
    player1Id: number,
    player2Id: number
): Promise<PlayerStats | null> {
    const minId = BigInt(Math.min(player1Id, player2Id));
    const maxId = BigInt(Math.max(player1Id, player2Id));

    return prisma.playerStats.findUnique({
        where: {
            player1TelegramId_player2TelegramId: {
                player1TelegramId: minId,
                player2TelegramId: maxId,
            },
        },
    });
}

function calculateWinStats(
    winnerId: bigint | null,
    minId: bigint,
    maxId: bigint,
    base: { player1Wins: number; player2Wins: number; draws: number }
) {
    const { player1Wins, player2Wins, draws } = base;

    if (winnerId === null) {
        return { player1Wins, player2Wins, draws: draws + 1 };
    }
    if (winnerId === minId) {
        return { player1Wins: player1Wins + 1, player2Wins, draws };
    }
    if (winnerId === maxId) {
        return { player1Wins, player2Wins: player2Wins + 1, draws };
    }
    return { player1Wins, player2Wins, draws };
}

export async function updatePlayerStats(
    player1Id: number,
    player2Id: number,
    winnerId: number | null
): Promise<void> {
    if (player1Id === player2Id) {
        logger.warn("Skipping stats update: same player on both sides");
        return;
    }

    const minId = BigInt(Math.min(player1Id, player2Id));
    const maxId = BigInt(Math.max(player1Id, player2Id));
    const existing = await getHeadToHeadStats(player1Id, player2Id);

    const baseStats = existing
        ? {
              player1Wins: existing.player1Wins,
              player2Wins: existing.player2Wins,
              draws: existing.draws,
          }
        : { player1Wins: 0, player2Wins: 0, draws: 0 };

    const winnerBigInt = winnerId !== null ? BigInt(winnerId) : null;
    const newStats = calculateWinStats(winnerBigInt, minId, maxId, baseStats);

    if (existing) {
        await prisma.playerStats.update({
            where: {
                player1TelegramId_player2TelegramId: {
                    player1TelegramId: minId,
                    player2TelegramId: maxId,
                },
            },
            data: {
                ...newStats,
                totalGames: { increment: 1 },
                lastPlayed: new Date(),
            },
        });
        return;
    }

    await prisma.playerStats.create({
        data: {
            player1TelegramId: minId,
            player2TelegramId: maxId,
            ...newStats,
            totalGames: 1,
        },
    });
}
