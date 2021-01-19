import "./styles.css";
import { navigate } from "./router.js";

window.onload = () => {
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener("click", e => {
            if (navigate(link.href)) {
                document.title = "Original Prusa Mini - " + link.innerText;
                history.pushState(null, document.title, link.href);
                e.preventDefault();
            }
        });
    });
    window.onpopstate = e => navigate(e.location);
    navigate(window.location.hash || "#dashboard");
};