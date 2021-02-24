import { translate } from "../../locale_provider";

const fileType = process.env.PRINTER_FAMILY === "fdm" ? "gcode": "sl1";

const upload = {
  init: () => {
    translate("upld.open", { query: ".upload p", file: `*.${fileType}` });
  }
};

export default upload;