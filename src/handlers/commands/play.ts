import { CommandContext, Context, Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { MESSAGES } from "../../constants/userMessages";
import { CALLBACK_PREFIXES } from "../../constants/callback";

export async function playCommand(ctx: CommandContext<Context>, bot: Bot){
    if (!ctx.from) {
        await ctx.reply(MESSAGES.USER_NOT_IDENTIFIED);
        return;
    }
    const difficultyKeyboard = new InlineKeyboard()
        .text("Easy 🟢", `${CALLBACK_PREFIXES.DIFFICULTY}easy`)
        .text("Hard 🔴", `${CALLBACK_PREFIXES.DIFFICULTY}hard`);
    await ctx.reply(MESSAGES.CHOOSE_DIFFICULTY, { reply_markup: difficultyKeyboard });
};

