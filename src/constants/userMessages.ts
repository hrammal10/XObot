export const MESSAGES = {
    //errors
    USER_NOT_IDENTIFIED: "Could not identify user",
    GAME_NOT_FOUND: "Game not found",
    CHAT_NOT_FOUND: "Not found",
    NOT_YOUR_TURN: "Not your turn!",
    CELL_TAKEN: "Cell already taken! Pick another empty cell",
    GAME_ALREADY_ENDED: "Game already ended!",
    GAME_IN_PROGRESS: "Game is still in progress",
    NOT_IN_GAME: "You are not in this game",
    CANT_JOIN_OWN_GAME: "Can't join your own game",
    GAME_FULL: "Game is full",

    WELCOME:
        "You ready for a game of Tic-Tac_Toe?\nType /play to start a game against the Master.\nType /challenge to challenge your friends!",

    CHOOSE_DIFFICULTY: "Choose difficulty:",

    GAME_CREATED: (symbol: string) =>
        `Game has been created. You are ${symbol}. Please share the invite link.`,

    //game joined and opponent mention
    GAME_JOINED: (opponentUsername: string | undefined, symbol: string, turnText: string) => {
        const opponentText = opponentUsername ? `vs @${opponentUsername}\n` : "";
        return `${opponentText}Game joined! You are ${symbol}. ${turnText}`;
    },

    YOUR_TURN: "Your turn!",
    WAITING_FOR_OPPONENT: "Waiting for opponent...",
    WAITING_FOR_SYMBOL: (symbol: string) => `Waiting for ${symbol}`,

    OPPONENT_JOINED: (
        opponentUsername: string | undefined,
        symbol: string,
        isYourTurn: boolean
    ) => {
        const opponentText = opponentUsername ? `Opponent: @${opponentUsername}\n` : "";
        const turnText = isYourTurn ? "It's your turn!" : "Waiting for opponent...";
        return `${opponentText}Your opponent joined. You are ${symbol}. ${turnText}`;
    },

    YOU_WIN: "You win!",
    MASTER_WINS: "The master wins!",
    SYMBOL_WINS: (symbol: string) => `${symbol} wins!`,
    DRAW: "It's a tie.",

    YOUR_TURN_WITH_SYMBOL: (symbol: string) => `Your turn! You are ${symbol}`,
    YOU_ARE_SYMBOL: (symbol: string) => `You are ${symbol}`,

    REMATCH_REQUESTED: "Rematch requested! Waiting for opponent...",
    REMATCH_STARTED_TEXT: "Rematch started!",
    REMATCH_WITH_SYMBOL: (symbol: string) => `Rematch! You are ${symbol}`,
    REMATCH_STARTED_FULL: (
        opponentUsername: string | undefined,
        symbol: string,
        turnText: string
    ) => {
        const opponentText = opponentUsername ? `vs @${opponentUsername}\n` : "";
        return `${opponentText}Rematch started! You are ${symbol}. ${turnText}`;
    },

    UNEXPECTED_ERROR: "An unexpected error occurred. Please try again.",

    INVITE_LINK_TEXT: (inviteLink: string) => `Join my Tic Tac Toe game here: ${inviteLink}!`,
} as const;
