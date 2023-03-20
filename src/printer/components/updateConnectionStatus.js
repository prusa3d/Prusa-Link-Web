import { setHidden } from "../../helpers/element";
import { translate } from "../../locale_provider";
import { modal } from "./modal";

const failuresBeforeOfflineScreen =
  process.env.WITH_FAILURES_BEFORE_OFFLINE_SCREEN;
let casesCount = 0;
let offlineScreen = null;

/** Updates connection status in telemetry. */
const updateConnectionStatus = ({ link, isConnected }) => {


  const alwaysShowStateOf = ["connect"];

  for (const name in link) {
    const { ok, message } = link[name];
    const msgElm = document.getElementById(`conn-status-${name}-msg`)
    if (msgElm) {
      msgElm.innerHTML =
        ok && name === "connect"
          ? message.toLowerCase() === "ok"
            ? translate("conn.connect.linked")
            : translate("conn.connect.not-linked")
          : message;
    }
    const stateNode = document.getElementById(`conn-status-${name}`);
    const stateSuccessIcon = stateNode.querySelector(".icon-success");
    const stateWarningIcon = stateNode.querySelector(".icon-warning");
    const isHidden = ok && !alwaysShowStateOf.includes(name);

    setHidden(stateNode, isHidden);
    if (!isHidden) {
      setHidden(stateSuccessIcon, !ok);
      setHidden(stateWarningIcon, ok);
    }
  }

  const countCaseAndToggleOfflineScreen = (toShow) => {
    if (casesCount < failuresBeforeOfflineScreen) {
      casesCount += 1;
    } else {
      toShow ? openOfflineScreen() : offlineScreen.close();
      casesCount = 0;
    }
  };

  if (isConnected) {
    offlineScreen && countCaseAndToggleOfflineScreen(false);
  } else {
    !offlineScreen && countCaseAndToggleOfflineScreen(true);
  }
};

const getOfflineScreenTranslation = (textId) => {
  switch (textId) {
    case "not-responsing":
      return translate("msg.offline.not-responsing");
    case "please-wait":
      return translate("msg.offline.please-wait");
    default:
      return "";
  }
};

const openOfflineScreen = () => {
  const createOfflineScreen = (close) => {
    const template = document.getElementById("offline-screen");
    const node = document.importNode(template.content, true);
    ["not-responsing", "please-wait"].forEach((id) => {
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
      },
    };
    return node;
  };
  modal((close) => createOfflineScreen(close), {
    timeout: 0,
    closeOutside: false,
    className: "offline-screen",
  });
};

export default updateConnectionStatus;
