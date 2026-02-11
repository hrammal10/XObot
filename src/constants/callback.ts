export const CALLBACK_PREFIXES = Object.freeze(
    Object.seal({
        JOIN: "join_",
        MOVE: "move:",
        DIFFICULTY: "difficulty:",
        REMATCH: "rematch:",
        INVITE: "invite_",
    } as const)
);
