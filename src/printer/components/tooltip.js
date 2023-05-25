import { onOutsideClick } from "../../helpers/element"

export const Tooltip = {
    init: (node) => {
        if (!node.getAttribute("tooltip")) {
            node.addEventListener("click", (e) => {
                node.classList.toggle("tooltip-handle--active")
                const tooltip = node.querySelector("span");
                onOutsideClick(
                    () => node.classList.remove("tooltip-handle--active"),
                    tooltip,
                    node
                );
                e.preventDefault()
            }, false)
            node.setAttribute("tooltip", true);
        }
    }
}