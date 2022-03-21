const webpackConfig = require("./webpack.config");

module.exports = (env, args) => {
    const config = {
        PRINTER_NAME: "Original Prusa SL1/S",
        PRINTER_TYPE: "sla",
        PROJECT_EXTENSIONS: [".sl1", ".sl1s"],

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