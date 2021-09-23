const webpackConfig = require("./webpack.config");

module.exports = (env, args) => {
    const config = {
        PRINTER_NAME: "Original Prusa SL1",
        PRINTER_TYPE: "sla",
    
        WITH_SETTINGS: false,
        WITH_CONTROLS: false,
        WITH_LOGS: false,
        WITH_FONT: true,
        ...env,
    };
    return webpackConfig(config, args);
}