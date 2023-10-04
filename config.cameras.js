const webpackConfig = require("./webpack.config");

module.exports = (env, args) => {
    const config = {
        PRINTER_NAME: "Original Prusa Camera Hub",
        PRINTER_TYPE: "virtual",
        FILE_EXTENSIONS: [],
        WITH_STORAGES: [],
        WITH_FILES: false,
        WITH_SETTINGS: false,
        WITH_CONTROLS: false,
        WITH_REMOTE_UPLOAD: false,
        WITH_SERIAL: false,
        WITH_COMMAND_SELECT: false,
        WITH_V1_API: true,
        WITH_PRINT_BUTTON: false,
        WITH_DOWNLOAD_BUTTON: false,
        WITH_CAMERAS: true,
        WITH_START_PRINT_AFTER_UPLOAD: false,
        WITH_LOGS: false,
        WITH_FONT: false,
        ...env,
    };
    return webpackConfig(config, args);
}