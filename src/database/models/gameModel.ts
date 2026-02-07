import { PrismaClient } from '../../generated/prisma/client';
import { Cell } from '../../game/types';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

export interface GamePlayer {
    telegramId: bigint;
    symbol: 'X' | 'O';
    isWinner: boolean;
}

export async function saveCompletedGame(
    gameMode: 'pve' | 'pvp',
    boardState: Cell[][],
    winnerTelegramId: bigint | null,
    status: 'won' | 'draw',
    players: GamePlayer[]
): Promise<number | null> {
    if (players.length === 0) {
        logger.warn("Skipping game save: no players");
        return null;
    }

    const game = await prisma.game.create({
        data: {
            gameMode,
            boardState: JSON.stringify(boardState),
            winnerTelegramId,
            status,
            players: {
                create: players.map(player => ({
                    playerTelegramId: player.telegramId,
                    symbol: player.symbol,
                    isWinner: player.isWinner
                }))
            }
        }
    });

    return game.id;
}

export async function getGameHistory(player1Id: bigint, player2Id: bigint): Promise<any[]> {
    const games = await prisma.game.findMany({
        where: {
            AND: [
                { players: { some: { playerTelegramId: player1Id } } },
                { players: { some: { playerTelegramId: player2Id } } }
            ]
        },
        include: {
            players: true
        },
        orderBy: {
            completedAt: 'desc'
        }
    });

    return games;
}
