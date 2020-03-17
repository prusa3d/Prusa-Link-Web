import { h } from "preact";
import StatusLeftItem from "./item";
import { PrinterStatus } from "../telemetry";
import { useTranslation } from "react-i18next";
import { numberFormat } from "../utils/format";

interface P {
  printer_status: PrinterStatus;
}

const StatusLeftBoard: preact.FunctionalComponent<P> = ({ printer_status }) => {
  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return ready ? (
    <div class="columns is-multiline is-mobile">
      <StatusLeftItem
        icon_id="nozzle"
        name={t("prop.temp-nozzle")}
        value={
          printer_status.temp_nozzle
            ? numberFormat(printer_status.temp_nozzle) + " °C"
            : "NA"
        }
      />
      <StatusLeftItem
        icon_id="bed"
        name={t("prop.temp-bed")}
        value={
          printer_status.temp_bed
            ? numberFormat(printer_status.temp_bed) + " °C"
            : "NA"
        }
      />
      <StatusLeftItem
        icon_id="mtl"
        name={t("prop.material")}
        value={printer_status.material ? printer_status.material : "NA"}
      />
    </div>
  ) : (
    <div />
  );
};

export default StatusLeftBoard;
