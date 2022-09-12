import { setEnabled } from "./element";

export const setButtonLoading = (button) => {
  const icon = button.querySelector("img");
  setEnabled(button, false);
  if (icon) {
      icon.setAttribute("data-src", icon.src);
      icon.src = document.querySelector(".loading-overlay img").src;
  }
}

export const unsetButtonLoading = (button) => {
  const icon = button.querySelector("img");
  setEnabled(button, true);
  if (icon) {
    const dataSrc = icon.getAttribute("data-src");
    if (dataSrc) {
      icon.src = dataSrc;
      icon.setAttribute("data-src", "");
    }
  }
}
