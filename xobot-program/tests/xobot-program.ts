import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { XobotProgram } from "../target/types/xobot_program";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";

describe("xobot-program", () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.xobotProgram as Program<XobotProgram>;
    const provider = anchor.getProvider() as anchor.AnchorProvider;

    const telegramId1 = new anchor.BN(111111);
    const telegramId2 = new anchor.BN(222222);

    function toLEBytes(n: anchor.BN): Buffer {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64LE(BigInt(n.toString()));
        return buf;
    }

    function findPlayerPDA(id: anchor.BN): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("player"), toLEBytes(id)],
            program.programId
        );
    }

    function findLeaderboardPDA(id: anchor.BN): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("leaderboard"), toLEBytes(id)],
            program.programId
        );
    }

    function findH2HPDA(id1: anchor.BN, id2: anchor.BN): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("head_to_head"), toLEBytes(id1), toLEBytes(id2)],
            program.programId
        );
    }

    it("init_player", async () => {
        const [playerKey] = findPlayerPDA(telegramId1);
        await program.methods.initPlayer(telegramId1, "alice").rpc();

        const acct = await program.account.playerAccount.fetch(playerKey);
        assert.equal(acct.username, "alice");
        assert.ok(acct.telegramId.eq(telegramId1));
    });

    it("update_player", async () => {
        const [playerKey] = findPlayerPDA(telegramId1);
        await program.methods.updatePlayer(telegramId1, "alice_updated").rpc();

        const acct = await program.account.playerAccount.fetch(playerKey);
        assert.equal(acct.username, "alice_updated");
    });

    it("save_game", async () => {
        const gameKeypair = Keypair.generate();
        await program.methods
            .saveGame(
                "pvp",
                "X-O-X-O-X-O-X-O-X",
                telegramId1,
                "completed",
                telegramId1,
                telegramId2,
                "X",
                "O",
                true,
                false
            )
            .accounts({ game: gameKeypair.publicKey })
            .signers([gameKeypair])
            .rpc();

        const acct = await program.account.gameRecord.fetch(gameKeypair.publicKey);
        assert.equal(acct.gameMode, "pvp");
        assert.equal(acct.player1IsWinner, true);
    });

    it("update_head_to_head", async () => {
        const [h2hKey] = findH2HPDA(telegramId1, telegramId2);
        await program.methods.updateHeadToHead(telegramId1, telegramId2, "player1_win").rpc();

        const acct = await program.account.headToHeadStats.fetch(h2hKey);
        assert.equal(acct.player1Wins, 1);
        assert.equal(acct.totalGames, 1);
    });

    it("update_leaderboard", async () => {
        const [lbKey] = findLeaderboardPDA(telegramId1);
        await program.methods.updateLeaderboard(telegramId1, "alice_updated", "win").rpc();

        const acct = await program.account.playerLeaderboard.fetch(lbKey);
        assert.equal(acct.totalWins, 1);
        assert.equal(acct.username, "alice_updated");
    });
});
