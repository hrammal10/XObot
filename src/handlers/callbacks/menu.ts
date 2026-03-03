import { CallbackQueryContext, Context, Bot, InlineKeyboard } from "grammy";
import { buildDifficultyKeyboard } from "../../ui/keyboard";
import { MESSAGES } from "../../constants/userMessages";
import { CALLBACK_PREFIXES } from "../../constants/callback";
import { BUTTON_LABELS } from "../../constants/buttons";
import { BOARD } from "../../constants/gameConfig";
import { getSymbolEmoji } from "../../constants/symbols";
import { createGame, updateGame } from "../../game/gameManager";
import { extractUser, getPlayerById } from "../../utils/playerUtils";
import { Player } from "../../game/types";

export async function menuPvECallback(ctx: CallbackQueryContext<Context>, bot: Bot): Promise<void> {
    if (!ctx.from) {
        await ctx.answerCallbackQuery({ text: MESSAGES.USER_NOT_IDENTIFIED, show_alert: true });
        return;
    }

    const keyboard = buildDifficultyKeyboard();

    await ctx.editMessageText(MESSAGES.CHOOSE_DIFFICULTY, {
        reply_markup: keyboard,
    });

    await ctx.answerCallbackQuery();
}

export async function menuPvPCallback(ctx: CallbackQueryContext<Context>, bot: Bot): Promise<void> {
    if (!ctx.from) {
        await ctx.answerCallbackQuery({ text: MESSAGES.USER_NOT_IDENTIFIED, show_alert: true });
        return;
    }

    const user = extractUser(ctx);
    if (!user.chatId) {
        await ctx.answerCallbackQuery({ text: MESSAGES.CHAT_NOT_FOUND, show_alert: true });
        return;
    }

    const game = createGame(
        user.id,
        user.chatId,
        "pvp",
        BOARD.ROWS,
        BOARD.COLS,
        undefined,
        user.username
    );
    if (!game) {
        await ctx.answerCallbackQuery({ text: MESSAGES.GAME_CREATION_FAILED, show_alert: true });
        return;
    }

    const creator = getPlayerById(game, user.id);
    if (!creator) {
        await ctx.answerCallbackQuery({ text: MESSAGES.GAME_CREATION_FAILED, show_alert: true });
        return;
    }

    const creatorSymbol = getSymbolEmoji(creator.symbol);
    const keyboard = buildInviteKeyboard(game.id);

    await ctx.editMessageText(MESSAGES.GAME_CREATED(creatorSymbol), {
        reply_markup: keyboard,
    });

    updateCreatorMessageId(game.id, game.players, user.id, ctx.msgId!);
    await ctx.answerCallbackQuery();
}

export async function menuHomeCallback(
    ctx: CallbackQueryContext<Context>,
    bot: Bot
): Promise<void> {
    if (!ctx.from) {
        await ctx.answerCallbackQuery({ text: MESSAGES.USER_NOT_IDENTIFIED, show_alert: true });
        return;
    }

    const keyboard = buildHomeKeyboard();

    await ctx.editMessageText(MESSAGES.WELCOME, {
        reply_markup: keyboard,
    });

    await ctx.answerCallbackQuery();
}

function updateCreatorMessageId(
    gameId: string,
    players: Player[],
    creatorId: number,
    messageId: number
): void {
    const updatedPlayers = players.map((p) => (p.id === creatorId ? { ...p, messageId } : p));
    updateGame(gameId, { players: updatedPlayers });
}

export function buildHomeKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
        .text(BUTTON_LABELS.PLAY_VS_BOT, CALLBACK_PREFIXES.MENU_PVE)
        .text(BUTTON_LABELS.CHALLENGE_FRIEND, CALLBACK_PREFIXES.MENU_PVP);
}

function buildInviteKeyboard(gameId: string): InlineKeyboard {
    return new InlineKeyboard()
        .switchInlineChosen(BUTTON_LABELS.INVITE, {
            query: `${CALLBACK_PREFIXES.INVITE}${gameId}`,
            allow_user_chats: true,
            allow_group_chats: true,
        })
        .row()
        .text(BUTTON_LABELS.RETURN, CALLBACK_PREFIXES.MENU_HOME);
}
