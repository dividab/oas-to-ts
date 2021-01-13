module.exports = {
  extends: "divid",
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "_[iI]gnored" }],
    "no-console": "error",
    "@typescript-eslint/array-type": ["error", { default: "array" }],
    "require-yield": 0,
    "max-lines": ["error", 2000],
    // Should be fixed in eslint-config-divid:
    // Enable these rules once code is fixed (or perhaps disable in eslint-config-divid):
    "@typescript-eslint/naming-convention": "off",
    "@typescript-eslint/consistent-type-imports": "off",
    "@typescript-eslint/no-shadow": "off",
    "@typescript-eslint/no-unnecessary-condition": "off",
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "@typescript-eslint/prefer-readonly-parameter-types": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/prefer-optional-chain": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-redeclare": "off", // We want to name type same as const
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/dot-notation": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-implicit-any-catch": "off",
    "@typescript-eslint/init-declarations": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/no-unused-expressions": "off",
    "@typescript-eslint/no-unsafe-call": "off",
  },
};
