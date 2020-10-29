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
        icon_id="temp"
        name={t("prop.temp-cpu")}
        value={
          printer_status.temp_cpu
            ? numberFormat(printer_status.temp_cpu) + " °C"
            : "NA"
        }
      />
      <StatusLeftItem
        icon_id="temp"
        name={t("prop.temp-led")}
        value={
          printer_status.temp_led
            ? numberFormat(printer_status.temp_led) + " °C"
            : "NA"
        }
      />
      <StatusLeftItem
        icon_id="temp"
        name={t("prop.temp-amb").toLowerCase()}
        value={
          printer_status.temp_amb
            ? numberFormat(printer_status.temp_amb) + " °C"
            : "NA"
        }
      />
      <StatusLeftItem
        icon_id="fan"
        name={t("prop.fan-led")}
        value={
          printer_status.uv_led_fan
            ? printer_status.uv_led_fan + " " + t("unit.rpm")
            : "NA"
        }
      />
      <StatusLeftItem
        icon_id="fan"
        name={t("prop.fan-blower").toLowerCase()}
        value={
          printer_status.blower_fan
            ? printer_status.blower_fan + " " + t("unit.rpm")
            : "NA"
        }
      />
      <StatusLeftItem
        icon_id="fan"
        name={t("prop.fan-rear").toLowerCase()}
        value={
          printer_status.rear_fan
            ? printer_status.rear_fan + " " + t("unit.rpm")
            : "NA"
        }
      />
      <StatusLeftItem
        icon_id="cover"
        name={t("prop.cover").toLowerCase()}
        value={
          printer_status.cover_state !== undefined
            ? printer_status.cover_state
              ? t("prop.cover-closed")
              : t("prop.cover-opened")
            : "NA"
        }
      />
    </div>
  ) : (
    <div />
  );
};

export default StatusLeftBoard;
