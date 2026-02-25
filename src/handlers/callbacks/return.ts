import { CallbackQueryContext, Context, Bot, InlineKeyboard } from "grammy";
import { MESSAGES } from "../../constants/userMessages";
import { CALLBACK_PREFIXES } from "../../constants/callback";
import { BUTTON_LABELS } from "../../constants/buttons";
import { getGame, deleteGame } from "../../game/gameManager";

export async function returnCallback(
    ctx: CallbackQueryContext<Context>,
    bot: Bot
): Promise<void> {
    if (!ctx.from) {
        await ctx.answerCallbackQuery({
            text: MESSAGES.USER_NOT_IDENTIFIED,
            show_alert: true,
        });
        return;
    }

    const gameId = extractGameId(ctx.callbackQuery.data);

    cleanupActiveGame(gameId);

    const keyboard = buildDifficultyKeyboard();

    await ctx.editMessageText(MESSAGES.CHOOSE_DIFFICULTY, {
        reply_markup: keyboard,
    });

    await ctx.answerCallbackQuery();
}

function extractGameId(data: string): string {
    return data.slice(CALLBACK_PREFIXES.RETURN.length);
}

function cleanupActiveGame(gameId: string): void {
    const game = getGame(gameId);
    if (game) {
        deleteGame(gameId);
    }
}

function buildDifficultyKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
        .text(BUTTON_LABELS.EASY, `${CALLBACK_PREFIXES.DIFFICULTY}easy`)
        .text(BUTTON_LABELS.HARD, `${CALLBACK_PREFIXES.DIFFICULTY}hard`)
        .row()
        .text(BUTTON_LABELS.RETURN, CALLBACK_PREFIXES.MENU_HOME);
}
