/**
 * This config is used to build only the userscript.
 * For building the extension, webextension-toolbox generates own config.
 */

const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const TerserPlugin = require('terser-webpack-plugin');
const usHeader = require("userscript-header").fromPackage("./package.json");
const sveltePreprocess = require("svelte-preprocess");
const SvelteCheckPlugin = require("svelte-check-plugin");


const dev = process.env.NODE_ENV === "development" || process.env.npm_lifecycle_event?.startsWith("dev-");

// create the meta file of the userscript
if (!fs.existsSync("packages")) {
    fs.mkdirSync("packages");
}
fs.writeFile(
    path.resolve(__dirname, "packages", "userscript.meta.js"),
    usHeader.toString(),
    (err) => err && console.log(err),
);

module.exports = {
    target: "esnext",
    mode: dev ? "development" : "production",
    entry: path.resolve(__dirname, "app", "userscript", "userscript.ts"),
    output: {
        path: path.resolve(__dirname, "packages"),
        filename: "userscript.user.js"
    },
    plugins: [
        new webpack.BannerPlugin({
            banner: usHeader.toString(),
            raw: true,
        }),
        new SvelteCheckPlugin({
            args: [`--ignore "dist"`],
        }),
    ],
    resolve: {
        alias: {
            svelte: path.resolve('node_modules', 'svelte')
        },
        extensions: [".ts", "..."],
        mainFields: ['svelte', 'browser', 'module', 'main'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.js$/,
                loader: "babel-loader",
                exclude: /(node_modules)/
            },
            {
                test: /\.css$/,
                loader: "css-loader",
            },
            {
                test: /\.svelte$/,
                use: {
                    loader: "svelte-loader",
                    options: {
                        preprocess: sveltePreprocess({}),
                    },
                },
            },
            {
              // required to prevent errors from Svelte on Webpack 5+, omit on Webpack 4
              test: /node_modules\/svelte\/.*\.mjs$/,
              resolve: {
                fullySpecified: false
              }
            },
        ],
    },
    optimization: {
        minimize: !dev,
        minimizer: [new TerserPlugin({
            terserOptions: {
                output: {
                    preamble: usHeader.toString(),
                },
            },
            extractComments: false,
        })],
    },
    devtool: false,
    experiments: {
        topLevelAwait: true,
    },
};
