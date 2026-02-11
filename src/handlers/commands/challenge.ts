import { CommandContext, Context, Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { MESSAGES } from "../../constants/userMessages";
import { getSymbolEmoji } from "../../constants/symbols";
import { BOARD } from "../../constants/gameConfig";
import { createGame, updateGame } from "../../game/gameManager";
import { getPlayerById } from "../../utils/playerUtils";
import { CALLBACK_PREFIXES } from "../../constants/callback";
import { Player } from "../../game/types";

export async function challengeCommand(ctx: CommandContext<Context>, bot: Bot): Promise<void> {
    if (!ctx.from) {
        await ctx.reply(MESSAGES.USER_NOT_IDENTIFIED);
        return;
    }
    const user = extractUser(ctx);
    const game = createPvPGame(user);
    const inviteKeyboard = buildInviteKeyboard(game.id);
    const creator = getPlayerById(game, user.id)!;
    const creatorSymbol = getSymbolEmoji(creator.symbol);
    const message = await sendChallengeMessage(ctx, creatorSymbol, inviteKeyboard);
    updateCreatorMessageId(game.id, game.players, user.id, message.message_id);
}

function extractUser(ctx: CommandContext<Context>) {
    return {
        id: ctx.from!.id,
        chatId: ctx.chat!.id,
        username: ctx.from!.username,
    };
}

function createPvPGame(user: { id: number; chatId: number; username?: string }) {
    return createGame(
        user.id,
        user.chatId,
        "pvp",
        BOARD.ROWS,
        BOARD.COLS,
        undefined,
        user.username
    );
}

function buildInviteKeyboard(gameId: string) {
    return new InlineKeyboard().switchInlineChosen("Click to join!", {
        query: `${CALLBACK_PREFIXES.INVITE}${gameId}`,
        allow_user_chats: true,
        allow_group_chats: true,
    });
}

async function sendChallengeMessage(
    ctx: CommandContext<Context>,
    symbol: string,
    keyboard: InlineKeyboard
) {
    return ctx.reply(MESSAGES.GAME_CREATED(symbol), {
        reply_markup: keyboard,
    });
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
