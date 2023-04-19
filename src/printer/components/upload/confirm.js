import { modal } from "../modal";
import { setDisabled } from "../../../helpers/element";
import { LinkState } from "../../../state";
import { translate } from "../../../locale_provider";

const createConfirmPrintAfterUpload = (close, checkbox) => {
    const template = document.getElementById("modal-confirm");
    const node = document.importNode(template.content, true);
    const yesButton = node.getElementById("yes");
    const noButton = node.getElementById("no");
    yesButton.addEventListener("click", (event) => {
      event.preventDefault();
      setDisabled(yesButton, true);
      setDisabled(noButton, true);
      checkbox.checked = true;
      close();
    });
    
    noButton.addEventListener("click", () => {
        checkbox.checked = false;
        close();
    });
    return node;
}

export const createConfirmReplaceFileByUpload = (close, fileDisplayName, onConfirm) => {
  const template = document.getElementById("modal-question");
  const node = document.importNode(template.content, true);
  const label = node.getElementById("modal-question-label");
  const fileName = document.createElement('p');
  const overwriteLabel = document.createElement('p');
  fileName.className = "txt-sm my-md txt-bold";
  fileName.innerText = fileDisplayName;
  label.innerText = translate("msg.file-exists.title");
  overwriteLabel.innerText = translate("msg.file-exists.overwrite-it");
  label.parentNode.append(fileName);
  label.parentNode.append(overwriteLabel);
  
  const yesButton = node.getElementById("yes");
  const noButton = node.getElementById("no");
  noButton.addEventListener("click", close);
  yesButton.addEventListener("click", (event) => {
    event.preventDefault();
    setDisabled(yesButton, true);
    setDisabled(noButton, true);
    onConfirm();
    close();
  });
  return node;
};

export const attachConfirmModalToCheckbox = (checkbox) => {
    checkbox.addEventListener("change", (event) => {       
        if (!checkbox.checked || checkbox.getAttribute("data-link-state") === LinkState.READY) {
            return;
        }
        modal((close) => createConfirmPrintAfterUpload(close, checkbox), {
          timeout: 0,
          closeOutside: false,
        });
    });
}
