import { InlineQueryContext, Context, InlineQueryResultBuilder, Bot } from "grammy";
import { MESSAGES } from "../../constants/userMessages";
import { CALLBACK_PREFIXES } from "../../constants/callback";

export async function inviteCallback(ctx: InlineQueryContext<Context>, bot: Bot){
    const gameId = ctx.inlineQuery.query.slice(CALLBACK_PREFIXES.INVITE.length);
    const inviteLink = `https://t.me/TicSmackToeBot?start=${CALLBACK_PREFIXES.JOIN}${gameId}`;
    const inviteMessage = MESSAGES.INVITE_LINK_TEXT(inviteLink);
    const result = InlineQueryResultBuilder.article(
        gameId,
        "TicTacToe Invite"
    ).text(inviteMessage);
    await ctx.answerInlineQuery([result]);
}