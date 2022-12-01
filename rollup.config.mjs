import fs from "node:fs";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import eslint from "rollup-plugin-eslint2";
import styles from "rollup-plugin-styles";
import svelte from "rollup-plugin-svelte";
import { visualizer } from "rollup-plugin-visualizer";
import sveltePreprocess from "svelte-preprocess";
import UserscriptHeader from "userscript-header";

const dev = process.env.NODE_ENV === "development"
    || process.env.npm_lifecycle_event?.startsWith("dev-");
const usHeader = UserscriptHeader.fromPackage("./package.json");

// create the meta file of the userscript
if (!fs.existsSync("packages")) {
    fs.mkdirSync("packages");
}
fs.writeFile(
    "packages/userscript.meta.js",
    usHeader.toString(),
    (err) => err && console.log(err),
);

export default {
    input: "app/userscript/userscript.ts",
    output: {
        sourcemap: false,
        format: "es",
        name: "userscript",
        file: "packages/userscript.user.js",
        banner: usHeader.toString(),
    },
    plugins: [
        eslint(),
        svelte({
            preprocess: sveltePreprocess(),
            compilerOptions: { dev },
        }),
        replace({
            "process.env.NODE_ENV": dev ? `"development"` : `"production"`,
        }),
        styles({
            mode: ["inject", { singleTag: true }],
            // attempts to minimize CSS by CSSNano or CSSO
            // was allowing to save just a few KiB
        }),
        resolve({
            browser: true,
            dedupe: ["svelte"],
        }),
        commonjs(),
        typescript(),
        // If we're building for production (npm run build
        // instead of npm run dev), minify
        !dev && terser({
            format: {
                comments: function leaveMetaBlock (node, { value }) {
                    if (value.trim().startsWith("==UserScript==")
                        && !("inmeta" in leaveMetaBlock)
                    ) {
                        leaveMetaBlock.inmeta = true;
                        return true;
                    }
                    if (value.trim().startsWith("==/UserScript==") && leaveMetaBlock.inmeta) {
                        leaveMetaBlock.inmeta = false;
                        return true;
                    }
                    return leaveMetaBlock.inmeta;
                },
            },
        }),
        !dev && visualizer({
            open: true,
            template: "treemap",
        }),
    ],
};
