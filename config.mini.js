const webpackConfig = require("./webpack.config");

module.exports = (env, args) => {
    const config = {
        PRINTER_NAME: "Original Prusa Mini",
        PRINTER_TYPE: "fdm",
    
        WITH_SETTINGS: false,
        WITH_CONTROLS: false,
        WITH_LOGS: false,
        WITH_FONT: false,
        ...env,
    };
    return webpackConfig(config, args);
}