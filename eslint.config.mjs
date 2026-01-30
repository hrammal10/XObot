import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier/recommended";

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module",
        },
        rules: {
            "prettier/prettier": "error",
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
];