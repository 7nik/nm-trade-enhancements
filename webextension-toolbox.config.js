const path = require("path");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const sveltePreprocess = require("svelte-preprocess");
const SvelteCheckPlugin = require("svelte-check-plugin");

module.exports = {
    webpack: (config, { dev, vendor }) => {
        // do not copy some files to the output folder
        config.plugins
            .find(plugin => plugin.constructor && plugin.constructor.name === "CopyPlugin")
            .patterns[0].globOptions.ignore
            .push("**/*.css", "components/*", "enhancements/*", "userscript/*", "utils/*");

        // extract css into own files
        config.plugins.push(new MiniCssExtractPlugin({
            filename: (pathData) => {
                try {
                    return pathData.chunk.name.replace("scripts/", "styles/") + ".css";
                } catch {
                    console.log(pathData);
                    return "[name].css";
                }
            }
        }));
        config.module.rules.push({
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, 'css-loader'],
        });

        // add svelte support
        config.plugins.push(new SvelteCheckPlugin({
            args: [`--ignore "dist"`],
        }));
        config.resolve.alias = {
            svelte: path.resolve('node_modules', 'svelte')
        };
        // config.resolve.extensions = [".ts", ".js", ".svelte", ".css"];
        config.resolve.mainFields = ['svelte', 'browser', 'module', 'main'];
        config.module.rules.push({
            test: /\.svelte$/,
            use: {
                loader: "svelte-loader",
                options: {
                    preprocess: sveltePreprocess({}),
                },
            },
        }, {
            // required to prevent errors from Svelte on Webpack 5+, omit on Webpack 4
            test: /node_modules\/svelte\/.*\.mjs$/,
            resolve: {
                fullySpecified: false
            }
        });

        // Important: return the modified config
        return config;
    },
};
