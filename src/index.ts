import 'dotenv/config';
import { Bot } from "grammy";
import { startCommand } from "./handlers/commands/start";
import { playCommand } from "./handlers/commands/play";
import { challengeCommand } from "./handlers/commands/challenge";
import { difficultyCallback } from "./handlers/callbacks/difficulty";
import { moveCallback } from "./handlers/callbacks/move";
import { rematchCallback } from "./handlers/callbacks/rematch";
import { inviteCallback } from "./handlers/callbacks/invite";
import { CALLBACK_PREFIXES } from "./constants/callback";
import { testDbConnection } from "./database/connection";

async function startBot(){

    await testDbConnection();
    const bot = new Bot(process.env.BOT_TOKEN!);
    
    bot.command("start", (ctx) => startCommand(ctx, bot));
    
    bot.command("play", (ctx) => playCommand(ctx, bot));
    
    bot.command("challenge", (ctx) => challengeCommand(ctx, bot));
    
    bot.callbackQuery(new RegExp(`^${CALLBACK_PREFIXES.DIFFICULTY}`), (ctx) => difficultyCallback(ctx, bot));
    
    bot.callbackQuery(new RegExp(`^${CALLBACK_PREFIXES.MOVE}`), (ctx) => moveCallback(ctx, bot));
    
    bot.inlineQuery(new RegExp(`^${CALLBACK_PREFIXES.INVITE}`), (ctx) => inviteCallback(ctx, bot));
    
    bot.callbackQuery(new RegExp(`^${CALLBACK_PREFIXES.REMATCH}`), (ctx) => rematchCallback(ctx, bot));
    
    bot.catch((err) => console.error("Bot error:", err));
    
    bot.start();
    
    console.log("bot started successfully.");

}

startBot().catch((error) => {
    console.error("Failed to start Bot:", error);
    process.exit(1);
})