const webpackConfig = require("./webpack.config");

module.exports = (env, args) => {
    const config = {
        PRINTER_NAME: "Original Prusa M1",
        PRINTER_TYPE: "sla",

        WITH_PROJECTS: true,
        WITH_SETTINGS: false,
        WITH_CONTROLS: false,
        WITH_REMOTE_UPLOAD: true,
        WITH_START_PRINT_AFTER_UPLOAD: true,
        WITH_LOGS: false,
        WITH_FONT: false,
        ...env,
    };
    return webpackConfig(config, args);
}