import { CommandContext, Context, Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { MESSAGES } from "../../constants/userMessages";
import { CALLBACK_PREFIXES } from "../../constants/callback";
import { BUTTON_LABELS } from "../../constants/buttons";

export async function playCommand(ctx: CommandContext<Context>, bot: Bot) {
    if (!ctx.from) {
        await ctx.reply(MESSAGES.USER_NOT_IDENTIFIED);
        return;
    }
    const difficultyKeyboard = new InlineKeyboard()
        .text(BUTTON_LABELS.EASY, `${CALLBACK_PREFIXES.DIFFICULTY}easy`)
        .text(BUTTON_LABELS.HARD, `${CALLBACK_PREFIXES.DIFFICULTY}hard`);
    await ctx.reply(MESSAGES.CHOOSE_DIFFICULTY, { reply_markup: difficultyKeyboard });
}
