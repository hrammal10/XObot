import "dotenv/config";
import { Bot } from "grammy";
import { startCommand } from "./handlers/commands/start";
import { playCommand } from "./handlers/commands/play";
import { challengeCommand } from "./handlers/commands/challenge";
import { leaderboardCommand } from "./handlers/commands/leaderboard";
import { historyCommand } from "./handlers/commands/history";
import { difficultyCallback } from "./handlers/callbacks/difficulty";
import { moveCallback } from "./handlers/callbacks/move";
import { rematchCallback } from "./handlers/callbacks/rematch";
import { inviteCallback } from "./handlers/callbacks/invite";
import { returnCallback } from "./handlers/callbacks/return";
import { menuPvECallback, menuPvPCallback, menuHomeCallback } from "./handlers/callbacks/menu";
import { CALLBACK_PREFIXES } from "./constants/callback";
import logger from "./utils/logger";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", (ctx) => startCommand(ctx, bot));
bot.command("play", (ctx) => playCommand(ctx, bot));
bot.command("challenge", (ctx) => challengeCommand(ctx, bot));
bot.command("leaderboard", (ctx) => leaderboardCommand(ctx));
bot.command("history", (ctx) => historyCommand(ctx));

bot.callbackQuery(CALLBACK_PREFIXES.MENU_PVE, (ctx) => menuPvECallback(ctx, bot));
bot.callbackQuery(CALLBACK_PREFIXES.MENU_PVP, (ctx) => menuPvPCallback(ctx, bot));
bot.callbackQuery(CALLBACK_PREFIXES.MENU_HOME, (ctx) => menuHomeCallback(ctx, bot));
bot.callbackQuery(new RegExp(`^${CALLBACK_PREFIXES.DIFFICULTY}`), (ctx) =>
    difficultyCallback(ctx, bot)
);
bot.callbackQuery(new RegExp(`^${CALLBACK_PREFIXES.MOVE}`), (ctx) => moveCallback(ctx, bot));
bot.inlineQuery(new RegExp(`^${CALLBACK_PREFIXES.INVITE}`), (ctx) => inviteCallback(ctx, bot));
bot.callbackQuery(new RegExp(`^${CALLBACK_PREFIXES.REMATCH}`), (ctx) => rematchCallback(ctx, bot));
bot.callbackQuery(new RegExp(`^${CALLBACK_PREFIXES.RETURN}`), (ctx) => returnCallback(ctx, bot));

bot.catch((err) => logger.error("Bot error:", err));
bot.start();
logger.info("bot started successfully.");
