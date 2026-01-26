import { Bot, InlineKeyboard, InlineQueryResultBuilder } from 'grammy';
import { GameStatus, PlayerSymbol } from './game/types';
import { createGame, updateGame, getGame, joinGame, deleteGame } from './game/GameManager';
import { isCellEmpty, makeMove, switchTurn, checkWinner, checkDraw, getBotMove, isPlayerTurn } from './game/GameLogic';
import { buildGameKeyboard } from './ui/keyboard';
import dotenv from 'dotenv';

dotenv.config()

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", async (ctx) => {
    if (!ctx.from) {
        await ctx.reply("Could not identify user");
        return;
    }
    const payload = ctx.match
    if (payload && payload.startsWith("join_")) {
        const gameId = payload.slice(5);
        const userId = ctx.from.id;
        const chatId = ctx.chat.id;
        const username = ctx.from.username;
        const result = joinGame(gameId, userId, chatId, username);
        if (!result.success) {
            await ctx.reply(result.error!)
            return;
        }
        const game = result.game;
        if (!game) {
            return;
        }
        
        // Figure out opponent username for each player
        const joinerOpponent = result.joinerSymbol === "X" ? game.playerOUsername : game.playerXUsername;
        const creatorOpponent = result.joinerSymbol === "X" ? game.playerXUsername : game.playerOUsername;
        
        const keyboard = buildGameKeyboard(game.board, game.id);
        const joinerOpponentText = joinerOpponent ? `vs @${joinerOpponent}\n` : "";
        const joinerSymbolEmoji = result.joinerSymbol === "X" ? "❌" : "⭕";
        const joinerTurnText = result.joinerSymbol === "X" ? "Your turn!" : "Waiting for opponent...";
        const messageO = await ctx.reply(`${joinerOpponentText}Game joined! You are ${joinerSymbolEmoji}. ${joinerTurnText}`, { reply_markup: keyboard })
        
        if (result.joinerSymbol === "X") {
            updateGame(gameId, { messageIdX: messageO.message_id });
        } else {
            updateGame(gameId, { messageIdO: messageO.message_id });
        }
        
        const updatedGame = getGame(gameId);
        if (!updatedGame) {
            return;
        }
        
        const creatorOpponentText = creatorOpponent ? `vs @${creatorOpponent}\n` : "";
        const creatorSymbol = result.joinerSymbol === "X" ? "⭕" : "❌"
        const turnMessage = result.joinerSymbol === "X"
            ? `${creatorOpponentText}Your opponent joined. You are ⭕. Waiting for X...`
            : `${creatorOpponentText}Your opponent joined. You are ❌. It's your turn!`
            
        if (result.joinerSymbol === "X") {
            if (!updatedGame.playerOChatId || !updatedGame.messageIdO) {
                return;
            }
            await bot.api.editMessageText(updatedGame.playerOChatId, updatedGame.messageIdO, turnMessage, { reply_markup: keyboard });
        } else {
            if (!updatedGame.playerXChatId || !updatedGame.messageIdX) {
                return;
            }
            await bot.api.editMessageText(updatedGame.playerXChatId, updatedGame.messageIdX, turnMessage, { reply_markup: keyboard })
        }
    } else {
        ctx.reply(`
You ready for a game of Tic-Tac_Toe? 
Type /play to start a game against the Master. \n
Type /challenge to challenge your friends!`)
    }

});

bot.command("play", async (ctx) => {
    if (!ctx.from) {
        await ctx.reply("Could not identify user");
        return;
    }
    const difficultyKeyboard = new InlineKeyboard()
        .text("Easy 🟢", "difficulty:easy")
        .text("Hard 🔴", "difficulty:hard")
    await ctx.reply("Choose difficulty:", { reply_markup: difficultyKeyboard })
});

bot.command("challenge", async (ctx) => {
    if (!ctx.from) {
        await ctx.reply("Could not identify user");
        return;
    }
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const username = ctx.from.username;
    const game = createGame(userId, chatId, "pvp", undefined, username);
    const inviteLink = `https://t.me/TicSmackToeBot?start=join_${game.id}`
    const inviteKeyboard = new InlineKeyboard().switchInlineChosen("Click to join!", {
        query: `invite_${game.id}`,
        allow_user_chats: true,
        allow_group_chats: true
    })
    const userSymbol = game.playerX === userId ? "❌" : "⭕";
    const message = await ctx.reply(`Game has been created. You are ${userSymbol}. Please share the invite link.`, { reply_markup: inviteKeyboard });
    if (game.playerX === userId) {
        updateGame(game.id, { messageIdX: message.message_id });
    } else {
        updateGame(game.id, { messageIdO: message.message_id });
    }
})

bot.callbackQuery(/^difficulty/, async (ctx) => {
    if (!ctx.from) {
        await ctx.answerCallbackQuery({ text: "Could not identify user", show_alert: true });
        return;
    }
    const data = ctx.callbackQuery.data;
    const difficulty = data.split(":")[1] as "easy" | "hard";
    const userId = ctx.from.id;
    const chatId = ctx.chat?.id;
    if (!chatId) {
        await ctx.answerCallbackQuery({ text: "Not found", show_alert: true })
        return;
    }
    const game = createGame(userId, chatId, "pve", difficulty);
    const botIsX = game.playerX === null;
    const userSymbol = game.playerX === userId ? "❌" : "⭕";
    let boardToShow = game.board;
    if (botIsX) {
        const botSymbol: PlayerSymbol = game.playerX === null ? "X" : "O";
        const botDecision = getBotMove(game.board, game.difficulty!, botSymbol);
        boardToShow = makeMove(game.board, botDecision, "X");
        updateGame(game.id, {
            board: boardToShow,
            currentTurn: "O"
        });
    }
    const keyboard = buildGameKeyboard(boardToShow, game.id);
    const message = await ctx.reply(`You are ${userSymbol}`, { reply_markup: keyboard })
    if (botIsX) {
        updateGame(game.id, { messageIdO: message.message_id })
    } else {
        updateGame(game.id, { messageIdX: message.message_id })
    }
    await ctx.answerCallbackQuery();
})

bot.callbackQuery(/^move:/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    const parts = data.split(":")
    const gameId = parts[1];
    const position = parseInt(parts[2]);
    const userId = ctx.from.id;
    const game = getGame(gameId);
    if (!game) {
        await ctx.answerCallbackQuery({ text: "Game not found", show_alert: true });
        return;
    }
    if (game.status !== "playing") {
        await ctx.answerCallbackQuery({ text: "Game already ended!", show_alert: true });
        return;
    }
    if (!isPlayerTurn(game, userId)) {
        await ctx.answerCallbackQuery({ text: "Not your turn!", show_alert: true });
        return;
    }
    if (!isCellEmpty(game.board, position)) {
        await ctx.answerCallbackQuery({ text: "Cell already taken! Pick another empty cell", show_alert: true });
        return;
    }
    let newBoard = makeMove(game.board, position, game.currentTurn);
    let newStatus: GameStatus = game.status;
    let newWinner: PlayerSymbol | null = game.winner;
    let newTurn: PlayerSymbol = switchTurn(game.currentTurn);
    let statusText = "";

    const winner = checkWinner(newBoard);
    if (winner) {
        newStatus = "won"
        newWinner = winner;
        if (game.mode === "pve") {
            statusText = "You win!";
        } else {
            statusText = `${winner} wins`;
        }
    } else if (checkDraw(newBoard)) {
        newStatus = "draw";
        statusText = "It is a tie."
    } else {
        if (game.mode === "pve") {
            const botSymbol: PlayerSymbol = game.playerX === null ? "X" : "O";
            const botPosition = getBotMove(newBoard, game.difficulty!, botSymbol);
            newBoard = makeMove(newBoard, botPosition, game.playerX === null ? "X" : "O");
            newTurn = switchTurn(game.playerX === null ? "X" : "O");

            const botWinner = checkWinner(newBoard);
            if (botWinner) {
                newStatus = "won";
                newWinner = botWinner;
                statusText = "The master wins";

            } else if (checkDraw(newBoard)) {
                newStatus = "draw";
                statusText = "It is a tie."
            } else {
                statusText = `Your turn! You are ${game.playerX === null ? "⭕" : "❌"}`;
            }
        } else {
            statusText = `Waiting for ${newTurn}`
        }
    }
    updateGame(gameId, {
        board: newBoard,
        status: newStatus,
        winner: newWinner,
        currentTurn: newTurn
    });
    const newKeyboard = buildGameKeyboard(newBoard, gameId);

    if (newStatus === "won" || newStatus === "draw") {
        newKeyboard.row();
        const rematchCount = game.mode === "pve" ? 1 : 0
        newKeyboard.text(`Rematch (${rematchCount}/2)`, `rematch:${gameId}`)

    }

    if (game.mode === "pve") {
        await ctx.editMessageText(statusText, { reply_markup: newKeyboard });
    }
    else if (game.mode === "pvp") {
        const xOpponent = game.playerOUsername ? `@${game.playerOUsername}` : "opponent";
        const oOpponent = game.playerXUsername ? `@${game.playerXUsername}` : "opponent";
        
        const statusTextX = `vs ${xOpponent}\n${statusText}`;
        const statusTextO = `vs ${oOpponent}\n${statusText}`;
        
        try {
            if (game.playerXChatId && game.messageIdX) {
                await bot.api.editMessageText(game.playerXChatId, game.messageIdX, statusTextX, { reply_markup: newKeyboard })
            }
        } catch (e) {
            console.error("failed to update player x board:", e)
        }
        try {
            if (game.playerOChatId && game.messageIdO) {
                await bot.api.editMessageText(game.playerOChatId, game.messageIdO, statusTextO, { reply_markup: newKeyboard })
            }
        } catch (e) {
            console.error("failed to update player o board:", e)
        }
    }

    await ctx.answerCallbackQuery();
});

bot.inlineQuery(/^invite_/, async (ctx) => {
    const gameId = ctx.inlineQuery.query.slice(7);
    const inviteLink = `https://t.me/TicSmackToeBot?start=join_${gameId}`;
    const inviteMessage = `Join my Tic Tac Toe game here: ${inviteLink}!`
    const result = InlineQueryResultBuilder
        .article(gameId, "TicTacToe Invite")
        .text(inviteMessage)
    await ctx.answerInlineQuery([result])
})

bot.callbackQuery(/^rematch/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    const parts = data.split(":")
    const gameId = parts[1]
    const game = getGame(gameId);
    if (!game) {
        await ctx.answerCallbackQuery({ text: "Not found", show_alert: true })
        return;
    }
    const rematchCount = game.rematchRequests?.length;
    const userId = ctx.from.id;
    const chatId = ctx.chat?.id;
    if (!chatId) {
        await ctx.answerCallbackQuery({ text: "Not found", show_alert: true })
        return;
    }
    const mode = game.mode;
    if (mode === "pve") {
        let newStatus: GameStatus = game.status;
        if (newStatus === "won" || newStatus === "draw") {
            const newGame = createGame(userId, chatId, "pve", game.difficulty)
            const botIsX = newGame.playerX === null;
            const userSymbol = newGame.playerX === userId ? "❌" : "⭕";
            let boardToShow = newGame.board;
            if (botIsX) {
                const botSymbol: PlayerSymbol = "X";
                const botDecision = getBotMove(newGame.board, newGame.difficulty!, botSymbol);
                boardToShow = makeMove(newGame.board, botDecision, "X");
                updateGame(newGame.id, {
                    board: boardToShow,
                    currentTurn: "O"
                })
            }
            const keyboard = buildGameKeyboard(boardToShow, newGame.id);
            await ctx.editMessageText(`Rematch! You are ${userSymbol}`, { reply_markup: keyboard })
            if (botIsX) {
                updateGame(newGame.id, { messageIdO: ctx.msgId })
            } else {
                updateGame(newGame.id, { messageIdX: ctx.msgId })
            }
            await ctx.answerCallbackQuery();
        }

    } else if (mode === "pvp") {
        if (game.status !== "won" && game.status !== "draw") {
            await ctx.answerCallbackQuery({ text: "Game is still in progess", show_alert: true })
            return;
        }

        let requests = game.rematchRequests || [];
        if (requests.includes(userId)) {
            await ctx.answerCallbackQuery({ text: "You already requested a rematch!", show_alert: true });
            return;
        }
        requests.push(userId);
        updateGame(gameId, { rematchRequests: requests });
        if (requests.length === 1) {
            const keyboard = buildGameKeyboard(game.board, gameId);
            keyboard.row()
            keyboard.text("Rematch (1/2)", `rematch:${gameId}`)
            if (game.playerXChatId && game.messageIdX) {
                await bot.api.editMessageReplyMarkup(game.playerXChatId, game.messageIdX, { reply_markup: keyboard })
            }
            if (game.playerOChatId && game.messageIdO) {
                await bot.api.editMessageReplyMarkup(game.playerOChatId, game.messageIdO, { reply_markup: keyboard })
            }
        } else if (requests.length === 2) {
            const playerXId = game.playerX!
            const playerOId = game.playerO!
            const playerXChatId = game.playerXChatId!
            const playerOChatId = game.playerOChatId!
            const oldMessageIdX = game.messageIdX!
            const oldMessageIdO = game.messageIdO!

            const newGame = createGame(playerXId, playerXChatId, "pvp")
            if (newGame.playerX === playerXId) {
                updateGame(newGame.id, {
                    playerO: playerOId,
                    playerOChatId: playerOChatId,
                    status: "playing"
                })
            } else {
                updateGame(newGame.id, {
                    playerX: playerOId,
                    playerXChatId: playerOChatId,
                    status: "playing"
                })
            }

            const updatedNewGame = getGame(newGame.id)!
            const keyboard = buildGameKeyboard(updatedNewGame.board, updatedNewGame.id)
            const playerXSymbol = updatedNewGame.playerX === playerXId ? "❌" : "⭕";
            const playerOSymbol = updatedNewGame.playerX === playerXId ? "⭕" : "❌";
            const firstTurn = updatedNewGame.playerX === playerXId ? "X" : "O";

            // Opponent for old playerX is always old playerO, and vice versa
            const playerXOpponent = game.playerOUsername ? `@${game.playerOUsername}` : "opponent";
            const playerOOpponent = game.playerXUsername ? `@${game.playerXUsername}` : "opponent";

            await bot.api.editMessageText(
                playerXChatId,
                oldMessageIdX,
                `vs ${playerXOpponent}\nRematch started! You are ${playerXSymbol}. ${firstTurn === "X" ? "Your turn" : "Waiting for opponent..."}`,
                { reply_markup: keyboard }
            )
            await bot.api.editMessageText(
                playerOChatId,
                oldMessageIdO,
                `vs ${playerOOpponent}\nRematch started! You are ${playerOSymbol}. ${firstTurn === "O" ? "Your turn" : "Waiting for opponent..."}`,
                { reply_markup: keyboard }
            )
            
            // Copy usernames to new game (keep original usernames with their original player IDs)
            updateGame(updatedNewGame.id, {
                playerXUsername: game.playerXUsername,
                playerOUsername: game.playerOUsername
            });
            
            if (newGame.playerX === playerXId){
                updateGame(updatedNewGame.id, {
                    messageIdX: oldMessageIdX,
                    messageIdO: oldMessageIdO
                })
            } else {    
                updateGame(updatedNewGame.id, {
                    messageIdX: oldMessageIdO,
                    messageIdO: oldMessageIdX
                })
            }
            deleteGame(gameId);
        }
        await ctx.answerCallbackQuery();
    }
})

bot.catch((err) => console.error("Bot error:", err));

bot.start()
console.log("bot started successfully.")