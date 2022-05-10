const webpackConfig = require("./webpack.config");

module.exports = (env, args) => {
    const config = {
        PRINTER_NAME: "Original Prusa Mini",
        PRINTER_TYPE: "fdm",

        WITH_STORAGES: ["usb"],
        WITH_PROJECTS: true,
        WITH_SETTINGS: false,
        WITH_CONTROLS: false,
        WITH_REMOTE_UPLOAD: false,
        WITH_START_PRINT_AFTER_UPLOAD: false,
        WITH_SERIAL: false,
        WITH_CONNECTION: false,
        WITH_LOGS: false,
        WITH_FONT: false,
        WITH_EMBEDDED_SVGS: true,
        WITH_COMMAND_SELECT: false,
        WITH_PRINT_BUTTON: false,
        ...env,
    };
    return webpackConfig(config, args);
}