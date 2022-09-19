import { modal } from "../modal";
import { setDisabled } from "../../../helpers/element";
import { LinkState } from "../../../state";

const createConfirmUpload = (close, checkbox) => {
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

export const attachConfirmModalToCheckbox = (checkbox) => {
    checkbox.addEventListener("change", (event) => {       
        if (!checkbox.checked || checkbox.getAttribute("data-link-state") === LinkState.READY) {
            return;
        }
        modal((close) => createConfirmUpload(close, checkbox), {
          timeout: 0,
          closeOutside: false,
        });
    });
}
