import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import idl from "./xobot_program.json";
import logger from "../utils/logger";
import { SOLANA_CONFIG } from "../constants/solana";

export interface HeadToHeadStatsAccount {
    player1TelegramId: BN;
    player2TelegramId: BN;
    player1Wins: number;
    player2Wins: number;
    draws: number;
    totalGames: number;
    lastPlayed: BN;
}

export interface PlayerLeaderboardAccount {
    telegramId: BN;
    username: string;
    totalWins: number;
    totalLosses: number;
    totalDraws: number;
}

export interface GameRecordAccount {
    gameMode: string;
    boardState: string;
    winnerTelegramId: BN | null;
    status: string;
    player1TelegramId: BN;
    player2TelegramId: BN;
    player1Symbol: string;
    player2Symbol: string;
    player1IsWinner: boolean;
    player2IsWinner: boolean;
    createdAt: BN;
    completedAt: BN;
}

const PROGRAM_ID = new PublicKey(SOLANA_CONFIG.PROGRAM_ID);

let _cachedProvider: { provider: AnchorProvider; program: Program } | null = null;

function getProvider(): { provider: AnchorProvider; program: Program } {
    if (_cachedProvider) {
        return _cachedProvider;
    }

    const rpcUrl = process.env.SOLANA_RPC_URL || SOLANA_CONFIG.DEFAULT_RPC_URL;
    const connection = new Connection(rpcUrl, SOLANA_CONFIG.COMMITMENT);

    const secretKey = process.env.SOLANA_PRIVATE_KEY;
    if (!secretKey) {
        throw new Error("SOLANA_PRIVATE_KEY env var not set");
    }

    const wallet = new anchor.Wallet(Keypair.fromSecretKey(bs58.decode(secretKey)));

    const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
    });

    const program = new Program(idl as unknown as anchor.Idl, provider);

    _cachedProvider = { provider, program };
    return _cachedProvider;
}

function playerPDA(telegramId: number | bigint): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("player"), toLEBytes(telegramId)],
        PROGRAM_ID
    );
}

function leaderboardPDA(telegramId: number | bigint): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("leaderboard"), toLEBytes(telegramId)],
        PROGRAM_ID
    );
}

function headToHeadPDA(id1: number | bigint, id2: number | bigint): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("head_to_head"), toLEBytes(id1), toLEBytes(id2)],
        PROGRAM_ID
    );
}

function toLEBytes(n: number | bigint): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(n));
    return buf;
}

function sortIds(a: number, b: number): [number, number] {
    return a <= b ? [a, b] : [b, a];
}

export async function initPlayer(telegramId: number, username: string): Promise<string> {
    const { program, provider } = getProvider();
    const [playerKey] = playerPDA(telegramId);

    // check username before pushing an updatePlayer txn
    try {
        const existing = await (program.account as any).playerAccount.fetch(playerKey);
        if (existing.username === username) {
            logger.info(`Player ${telegramId} already up-to-date, skipping transaction.`);
            return "skipped";
        }
        logger.info(
            `Player ${telegramId} username changed: "${existing.username}" → "${username}"`
        );
        return updatePlayer(telegramId, username);
    } catch {
        logger.info(`Player ${telegramId} not found on-chain, creating new account.`);
    }

    try {
        const tx = await (program.methods as any)
            .initPlayer(new BN(telegramId), username)
            .accounts({
                player: playerKey,
                signer: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
        logger.info(`initPlayer(${telegramId}, "${username}") → tx: ${tx}`);
        logger.info(
            `Explorer: https://explorer.solana.com/tx/${tx}?cluster=${SOLANA_CONFIG.CLUSTER}`
        );
        return tx;
    } catch (e: any) {
        if (
            e?.message?.includes("already in use") ||
            e?.logs?.some((l: string) => l.includes("already in use"))
        ) {
            logger.info(`Player ${telegramId} already initialised, updating…`);
            return updatePlayer(telegramId, username);
        }
        throw e;
    }
}

export async function updatePlayer(telegramId: number, username: string): Promise<string> {
    const { program, provider } = getProvider();
    const [playerKey] = playerPDA(telegramId);

    const tx = await (program.methods as any)
        .updatePlayer(new BN(telegramId), username)
        .accounts({
            player: playerKey,
            signer: provider.wallet.publicKey,
        })
        .rpc();
    logger.info(`updatePlayer(${telegramId}, "${username}") → tx: ${tx}`);
    logger.info(`Explorer: https://explorer.solana.com/tx/${tx}?cluster=${SOLANA_CONFIG.CLUSTER}`);
    return tx;
}

export async function saveGame(params: {
    gameMode: string;
    boardState: string;
    winnerTelegramId: number | null;
    status: string;
    player1TelegramId: number;
    player2TelegramId: number;
    player1Symbol: string;
    player2Symbol: string;
    player1IsWinner: boolean;
    player2IsWinner: boolean;
}): Promise<string> {
    const { program, provider } = getProvider();
    const gameKeypair = Keypair.generate();

    const tx = await (program.methods as any)
        .saveGame(
            params.gameMode,
            params.boardState,
            params.winnerTelegramId !== null ? new BN(params.winnerTelegramId) : null,
            params.status,
            new BN(params.player1TelegramId),
            new BN(params.player2TelegramId),
            params.player1Symbol,
            params.player2Symbol,
            params.player1IsWinner,
            params.player2IsWinner
        )
        .accounts({
            game: gameKeypair.publicKey,
            signer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([gameKeypair])
        .rpc();

    logger.info(`saveGame(${params.player1TelegramId} vs ${params.player2TelegramId}) → tx: ${tx}`);
    logger.info(`Game account: ${gameKeypair.publicKey.toBase58()}`);
    logger.info(`Explorer: https://explorer.solana.com/tx/${tx}?cluster=${SOLANA_CONFIG.CLUSTER}`);
    return tx;
}

export async function updateHeadToHeadStats(
    player1TelegramId: number,
    player2TelegramId: number,
    result: "player1_win" | "player2_win" | "draw"
): Promise<string> {
    const [sorted1, sorted2] = sortIds(player1TelegramId, player2TelegramId);
    const { program, provider } = getProvider();
    const [h2hKey] = headToHeadPDA(sorted1, sorted2);

    let adjustedResult = result;
    if (player1TelegramId !== sorted1) {
        if (result === "player1_win") adjustedResult = "player2_win";
        else if (result === "player2_win") adjustedResult = "player1_win";
    }

    const tx = await (program.methods as any)
        .updateHeadToHead(new BN(sorted1), new BN(sorted2), adjustedResult)
        .accounts({
            stats: h2hKey,
            signer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

    logger.info(`updateH2H(${sorted1} vs ${sorted2}, ${adjustedResult}) → tx: ${tx}`);
    logger.info(`Explorer: https://explorer.solana.com/tx/${tx}?cluster=${SOLANA_CONFIG.CLUSTER}`);
    return tx;
}

export async function updateLeaderboard(
    telegramId: number,
    username: string,
    result: "win" | "loss" | "draw"
): Promise<string> {
    const { program, provider } = getProvider();
    const [lbKey] = leaderboardPDA(telegramId);

    const tx = await (program.methods as any)
        .updateLeaderboard(new BN(telegramId), username, result)
        .accounts({
            leaderboard: lbKey,
            signer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

    logger.info(`updateLeaderboard(${telegramId}, ${result}) → tx: ${tx}`);
    logger.info(`Explorer: https://explorer.solana.com/tx/${tx}?cluster=${SOLANA_CONFIG.CLUSTER}`);
    return tx;
}

export async function getHeadToHeadStats(
    player1Id: number,
    player2Id: number
): Promise<HeadToHeadStatsAccount | null> {
    const [sorted1, sorted2] = sortIds(player1Id, player2Id);
    const { program } = getProvider();
    const [h2hKey] = headToHeadPDA(sorted1, sorted2);

    try {
        const account = await (program.account as any).headToHeadStats.fetch(h2hKey);
        if (player1Id !== sorted1) {
            return {
                ...account,
                player1TelegramId: account.player2TelegramId,
                player2TelegramId: account.player1TelegramId,
                player1Wins: account.player2Wins,
                player2Wins: account.player1Wins,
            };
        }
        return account as HeadToHeadStatsAccount;
    } catch {
        return null;
    }
}

export async function getLeaderboard(): Promise<PlayerLeaderboardAccount[]> {
    const { program } = getProvider();

    const allAccounts = await (program.account as any).playerLeaderboard.all();

    const entries: PlayerLeaderboardAccount[] = allAccounts.map(
        (a: any) => a.account as PlayerLeaderboardAccount
    );

    entries.sort((a, b) => b.totalWins - a.totalWins);
    return entries.slice(0, 10);
}

export async function getPlayerHistory(telegramId: number): Promise<GameRecordAccount[]> {
    const { program } = getProvider();

    const allGames = await (program.account as any).gameRecord.all();

    const filtered: GameRecordAccount[] = allGames
        .map((a: any) => a.account as GameRecordAccount)
        .filter(
            (g: GameRecordAccount) =>
                g.player1TelegramId.eq(new BN(telegramId)) ||
                g.player2TelegramId.eq(new BN(telegramId))
        );

    filtered.sort((a, b) => b.completedAt.toNumber() - a.completedAt.toNumber());

    return filtered;
}

export async function getPlayerUsername(telegramId: number): Promise<string | null> {
    const { program } = getProvider();
    const [playerKey] = playerPDA(telegramId);

    try {
        const account = await (program.account as any).playerAccount.fetch(playerKey);
        return account.username;
    } catch {
        return null;
    }
}

export async function getAllPlayers(): Promise<
    { telegramId: BN; username: string; createdAt: BN }[]
> {
    const { program } = getProvider();
    const allAccounts = await (program.account as any).playerAccount.all();
    return allAccounts.map((a: any) => a.account);
}
