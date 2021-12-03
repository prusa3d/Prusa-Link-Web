import { setHidden, setVisible } from "../../helpers/element";
import { translate } from "../../locale_provider";

/** Updates connection status in telemetry. */
const updateConnectionStatus = ({ connection, isConnected }) => {
  if (isConnected) {
    const states = connection?.states;
    for (const name in states) {
      const { ok, message } = states[name];
      const msgElm = document.getElementById(`conn-status-${name}-msg`);
      if (msgElm)
        msgElm.innerHTML = message;
      setHidden(document.getElementById(`conn-status-${name}`), ok);
    }
  } else {
    const msgElm = document.getElementById("conn-status-printer-msg");
    if (msgElm)
      msgElm.innerHTML = translate("conn.err-conn");
    setVisible(document.getElementById("conn-status-printer"));
  }
}

export default updateConnectionStatus;
