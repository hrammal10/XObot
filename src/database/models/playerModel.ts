import { PrismaClient, Player } from "../../generated/prisma/client";

const prisma = new PrismaClient();

export type PlayerDB = Player;

export async function createOrGetPlayer(telegramId: number, username?: string): Promise<PlayerDB> {
    const telegramIdBigInt = BigInt(telegramId);
    const existing = await findPlayer(telegramIdBigInt);
    if (existing) {
        return syncUsername(existing, username);
    }
    return insertNewPlayer(telegramIdBigInt, username);
}

export async function getPlayerById(telegramId: number): Promise<PlayerDB | null> {
    return findPlayer(BigInt(telegramId));
}

async function findPlayer(telegramId: bigint): Promise<PlayerDB | null> {
    return prisma.player.findUnique({
        where: { telegramId },
    });
}

async function syncUsername(player: PlayerDB, newUsername?: string): Promise<PlayerDB> {
    if (!newUsername || player.username === newUsername) {
        return player;
    }
    return prisma.player.update({
        where: { telegramId: player.telegramId },
        data: { username: newUsername },
    });
}

async function insertNewPlayer(telegramId: bigint, username?: string): Promise<PlayerDB> {
    return prisma.player.create({
        data: {
            telegramId,
            username,
        },
    });
}
