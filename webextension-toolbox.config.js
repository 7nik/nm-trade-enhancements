const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  webpack: (config, { dev, vendor }) => {
    // do not copy some files to the output folder
    config.plugins
      .find(plugin => plugin.constructor && plugin.constructor.name === "CopyPlugin")
      .patterns[0].globOptions.ignore
      .push("**/*.css", "enhancements/*", "userscript/*", "utils/*");
    
    // extract css into own files
    config.plugins.push(new MiniCssExtractPlugin({
      filename: (pathData) => {
        try{
          return pathData.chunk.name.replace("scripts/", "styles/")+".css";
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
  
    // Important: return the modified config
    return config;
  },
};
