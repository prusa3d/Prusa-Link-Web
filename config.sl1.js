const webpackConfig = require("./webpack.config");

module.exports = (env, args) => {
    const config = {
        PRINTER_NAME: "Original Prusa SL1/S",
        PRINTER_TYPE: "sla",
        FILE_EXTENSIONS: [".sl1"],
        LOCAL_STORAGE_NAME: ["Local"],

        WITH_STORAGES: ["local", "usb"],
        WITH_FILES: true,
        WITH_SETTINGS: true,
        WITH_CONTROLS: false,
        WITH_REMOTE_UPLOAD: true,
        WITH_START_PRINT_AFTER_UPLOAD: true,
        WITH_LOGS: false,
        WITH_FONT: false,
        WITH_V1_API: true,
        ...env,
    };
    return webpackConfig(config, args);
}