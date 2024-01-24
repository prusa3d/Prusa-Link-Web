const webpackConfig = require("./webpack.config");

module.exports = (env, args) => {
    const config = {
        PRINTER_NAME: "Original Prusa M1",
        PRINTER_TYPE: "sla",
        FILE_EXTENSIONS: [".m1"],
        LOCAL_STORAGE_NAME: ["Local"],

        WITH_STORAGES: ["local", "usb"],
        WITH_FILES: true,
        WITH_SETTINGS: true,
        WITH_CONTROLS: false,
        WITH_REMOTE_UPLOAD: true,
        WITH_START_PRINT_AFTER_UPLOAD: true,
        WITH_LOGS: false,
        WITH_FONT: false,
        ...env,
    };
    return webpackConfig(config, args);
}