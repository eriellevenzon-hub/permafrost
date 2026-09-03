/* Deleting a block of code leaves the lines that referenced it
   behind, and the build can't see that — `a is not defined` only
   surfaces at runtime, on the first scroll frame. no-undef and
   no-unused-vars catch both halves of that mistake. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
  rules: {
    "no-undef": "error",
    "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
  },
  globals: { React: "readonly" },
};
