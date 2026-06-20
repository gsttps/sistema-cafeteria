import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Entorno de Navegador (Browser globals)
        document: "readonly",
        window: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        alert: "readonly",
        HTMLDivElement: "readonly",
        HTMLInputElement: "readonly",
        MouseEvent: "readonly",
        Node: "readonly",
        React: "readonly",
        Image: "readonly",
        FileReader: "readonly",
        localStorage: "readonly",
        URLSearchParams: "readonly",
        File: "readonly",
        FormData: "readonly",
        Date: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": ts,
      react: react,
      "react-hooks": reactHooks,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": "off", // Desactivar regla estándar de JS
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], // Activar regla de TS
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
