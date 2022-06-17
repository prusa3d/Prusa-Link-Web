import { modal } from "../modal";

const createConfirmUpload = (close, checkbox) => {
    const template = document.getElementById("modal-confirm");
    const node = document.importNode(template.content, true);
    const yesButton = node.getElementById("yes");
    yesButton.addEventListener("click", (event) => {
      event.preventDefault();
      checkbox.checked = true;
      close();
    });
    const noButton = node.getElementById("no");
    noButton.addEventListener("click", () => {
        checkbox.checked = false;
        close();
    });
    return node;
}

export const attachConfirmModalToCheckbox = (checkbox) => {
    checkbox.addEventListener("change", (event) => {       
        if (!checkbox.checked) {
            return;
        }
        modal((close) => createConfirmUpload(close, checkbox), {
          timeout: 0,
          closeOutside: false,
        });
    });
}
