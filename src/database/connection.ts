import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

export async function testConnection() {
    try {
        const client = await pool.connect();
        console.log("✅ Database connected successfully");
        client.release();
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        process.exit(1);
    }
}
