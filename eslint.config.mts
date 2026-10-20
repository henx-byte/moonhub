// eslint.config.js
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
 expoConfig,
 {
  ignores: ["node_modules/**", "dist/**", ".expo/**", "android/**", "ios/**", "**/*.md", "**/*.json"],
 },
 {
  settings: {
   react: {
    version: "19.0",
   },
  },
  rules: {
   // React 17+ / Expo: tidak perlu import React untuk JSX
   "react/react-in-jsx-scope": "off",
   "react/display-name": "off",
   "import/no-unresolved": "off",

   // Project ini banyak pakai any (source plugin, extra data, dll)
   "@typescript-eslint/no-explicit-any": "off",

   // Catch kosong & unused sementara di toleransi
   "no-empty": "off",
   "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
   "@typescript-eslint/no-require-imports": "off",
   "prefer-const": "warn",
  },
 },
]);
