module.exports = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        // extraFileExtensions: [".svelte"],
    },
    env: {
        es6: true,
        browser: true,
    },
    extends: [
        "airbnb-base",
        "plugin:sonarjs/recommended",
        "plugin:unicorn/recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:svelte/recommended",
    ],
    plugins: [
        "unicorn",
        "sonarjs",
        // "svelte3",
        "@typescript-eslint",
    ],
    settings: {
        // eslint-disable-next-line import/no-extraneous-dependencies, global-require
        "svelte3/typescript": () => require("typescript"),
        "import/resolver": {
            typescript: {}, // this loads <rootdir>/tsconfig.json to eslint
        },
        svelte: {
            ignoreWarnings: [
                "a11y-click-events-have-key-events",
            ],
        },
    },
    overrides: [
        {
            files: ["*.svelte"],
            // processor: "svelte3/svelte3",
            parser: "svelte-eslint-parser",
            parserOptions: {
                parser: "@typescript-eslint/parser",
            },
        },
    ],
    globals: {
        NodeJS: true,
        $$Generic: true,
    },
    rules: {
        "@typescript-eslint/ban-ts-comment": ["error", {
            "ts-ignore": "allow-with-description",
        }],
        "@typescript-eslint/default-param-last": "error",
        "@typescript-eslint/no-use-before-define": [
            "error",
            {
                functions: false,
            },
        ],
        /* override default rule settings */
        "array-bracket-newline": [
            "error",
            "consistent",
        ],
        "array-element-newline": [
            "error",
            "consistent",
        ],
        "arrow-parens": [
            "error",
            "always",
        ],
        curly: [
            "error",
            "multi-line",
            "consistent",
        ],
        "func-style": [
            "error",
            "declaration",
            { allowArrowFunctions: true },
        ],
        "import/extensions": ["error", "ignorePackages", { ts: "never" }],
        "import/no-extraneous-dependencies": [
            "error", {
                devDependencies: ["rollup.config.mjs"],
                optionalDependencies: false,
                peerDependencies: false,
                packageDir: __dirname,
            },
        ],
        indent: [
            "error",
            4,
            {
                SwitchCase: 1,
                flatTernaryExpressions: true,
                // ignoredNodes: ["TemplateLiteral *"], // no correct support in string templates
            },
        ],
        "id-blacklist": ["error", "e", "$e", "arguments"],
        "import/order": [
            "error",
            {
                groups: [
                    "type",
                    "builtin",
                    "external",
                    "internal",
                    "parent",
                    "sibling",
                    "index",
                    "object",
                ],
                alphabetize: {
                    order: "asc",
                    caseInsensitive: true,
                },
                warnOnUnassignedImports: false,
            },
        ],
        "key-spacing": [
            "error",
            { mode: "minimum" }, // to allow alignment
        ],
        "lines-between-class-members": [
            "error",
            "always",
            { exceptAfterSingleLine: true },
        ],
        "max-len": [
            "warn",
            {
                code: 100,
                ignoreUrls: true,
            },
        ],
        "max-statements-per-line": [
            "error",
            { max: 2 },
        ],
        "multiline-ternary": [
            "error",
            "always-multiline",
        ],
        "no-plusplus": [
            "error",
            { allowForLoopAfterthoughts: true },
        ],
        "no-unused-vars": [
            "error",
            { args: "none" },
        ],
        quotes: [
            "error",
            "double",
            { allowTemplateLiterals: true },
        ],
        "one-var": [
            "error",
            { initialized: "never" },
        ],
        "padding-line-between-statements": [
            "error",
            { blankLine: "always", prev: "function", next: "*" },
            { blankLine: "always", prev: "class", next: "*" },
            { blankLine: "always", prev: "directive", next: "*" },
        ],
        "space-before-function-paren": [
            "error",
            "always",
        ],
        strict: [
            "error",
            "global",
        ],
        "unicorn/no-unsafe-regex": "error",

        /* candidates for disabling */

        /* disable */
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "default-param-last": "off", // ts
        "import/no-mutable-exports": "off", // it's props in Svelte
        "import/prefer-default-export": "off", // Svelte
        "no-console": "off",
        "no-continue": "off",
        "no-mixed-operators": "off",
        "no-multi-spaces": "off", // due align
        "no-nested-ternary": "off",
        "no-new": "off", // due MutationSummary
        "no-param-reassign": "off",
        // for-of and for-in make sense only for old browsers,
        // and labels and with I don't use without reason anyway
        "no-restricted-syntax": "off",
        "no-self-assign": "off", // Svelte
        "no-sequences": "off", // in Svelte's $
        "no-var": "off", // don't use anyway
        "no-use-before-define": "off",
        "no-unused-expressions": "off", // in Svelte's $
        "svelte/valid-compile": "off", // https://github.com/ota-meshi/eslint-plugin-svelte/issues/311
        "vars-on-top": "off", // don't use anyway
        "unicorn/catch-error-name": "off",
        "unicorn/consistent-function-scoping": "off",
        "unicorn/filename-case": "off",
        "unicorn/no-array-callback-reference": "off",
        "unicorn/no-document-cookie": "off", // firstly implement cookieStore in FF and Safari
        "unicorn/no-null": "off",
        "unicorn/prefer-query-selector": "off",
        "unicorn/prefer-spread": "off", // for better readability
        "unicorn/prefer-top-level-await": "off", // not allowed in Svelte
        "unicorn/prevent-abbreviations": "off",
        "unicorn/switch-case-braces": ["error", "avoid"],
    },
};
