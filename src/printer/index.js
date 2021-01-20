
const printer = (() => {
    if (process.env.TYPE == "Mini") return require("./mini");
    if (process.env.TYPE == "SL1") return require("./sl1");
    if (process.env.TYPE == "MK3") return require("./mk3");   
})().default;

export default printer;