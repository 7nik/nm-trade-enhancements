/**
 * This config is used to build only the userscript.
 * For building the extension, webextension-toolbox generates own config.
 */

const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const TerserPlugin = require('terser-webpack-plugin'); 
const usHeader = require("userscript-header").fromPackage("./package.json");

const dev = process.env.NODE_ENV === "development";

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
    ],
    resolve: {
        extensions: [".ts", "..."]
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
                // use: [
                //     // { loader: "css-to-string-loader" },
                //     { loader: "css-loader" },
                // ],
                loader: "css-loader",
                // options: {
                //     exportType: "array",
                // }
            },
        ],
    },
    optimization: {
        minimize: !dev,
        minimizer: [new TerserPlugin({
            extractComments: {
                condition: false,
                banner: usHeader.toString(),
            },
        })],
    }
};
