import { setHidden, setVisible } from "../../helpers/element";
import { translate } from "../../locale_provider";
import { modal } from "./modal";

const failuresBeforeOfflineScreen = process.env.WITH_FAILURES_BEFORE_OFFLINE_SCREEN;
let casesCount = 0;
let offlineScreen = null;

/** Updates connection status in telemetry. */
const updateConnectionStatus = ({ connection, isConnected }) => {
  if (isConnected) {
    const states = connection?.states || {"printer": {"ok": true, "message": ""}};

    if (offlineScreen) {
      if (casesCount < failuresBeforeOfflineScreen) {
        casesCount += 1;
      } else {
        offlineScreen.close();
        casesCount = 0;
      }
    }

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

    if (!offlineScreen) {
      if (casesCount < failuresBeforeOfflineScreen) {
        casesCount += 1;
      } else {
        openOfflineScreen();
        casesCount = 0;
      }
    }
  }
}

const getOfflineScreenTranslation = (textId) => {
  switch (textId) {
    case 'not-responsing':
      return translate("msg.offline.not-responsing");
    case 'please-wait':
      return translate("msg.offline.please-wait");
    default:
      return "";
  }
}

const openOfflineScreen = () => {
  const createOfflineScreen = (close) => {
    const template = document.getElementById("offline-screen");
    const node = document.importNode(template.content, true);
    ["not-responsing", "please-wait"].forEach(id => {
      const label = node.getElementById(`offline-screen.${id}`);
      if (label) {
        label.innerHTML = getOfflineScreenTranslation(id);
      }
    });
    offlineScreen = {
      node,
      close: () => {
        close();
        offlineScreen = null;
      }
    };
    return node;
  };
  modal((close) => createOfflineScreen(close), {
    timeout: 0,
    closeOutside: false,
    className: 'offline-screen'
  });
}

export default updateConnectionStatus;
