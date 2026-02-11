import { PrismaClient } from "../generated/prisma/client";
import logger from "../utils/logger";

export const prisma = new PrismaClient();

export async function testDbConnection() {
    try {
        await prisma.$connect();
        logger.info("Database connected successfully");
    } catch (error) {
        logger.error("Database connection failed:", error);
        process.exit(1);
    }
}
