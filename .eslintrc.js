module.exports = {
  parser: "@typescript-eslint/parser",
  root: true,
  env: {
    node: true,
  },
  extends: ["plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],
  plugins: ["sort-imports-es6-autofix"],
  // add your custom rules here
  rules: {
    "nuxt/no-cjs-in-config": "off",
    "no-console": "off",
    "max-len": ["off", 80, 4],
    "no-prototype-builtins": "off",
    "require-await": "off",
    "one-var": "off",
    "sort-imports-es6-autofix/sort-imports-es6": "warn",
    "@typescript-eslint/no-explicit-any": "off",
  },
};
