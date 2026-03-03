import { CallbackQueryContext, Context, Bot } from "grammy";
import { MESSAGES } from "../../constants/userMessages";
import { CALLBACK_PREFIXES } from "../../constants/callback";
import { getGame, deleteGame } from "../../game/gameManager";
import { buildDifficultyKeyboard } from "../../ui/keyboard";

export async function returnCallback(ctx: CallbackQueryContext<Context>, bot: Bot): Promise<void> {
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
