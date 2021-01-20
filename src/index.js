import "./styles.css";
import { navigate } from "./router.js";

window.onload = () => {
    document.getElementById("menu").addEventListener("click", e => {
        if (e.className == "navbar-burger") {
          e.className = "navbar-burger burger-open";
          document.getElementById("navbar").className = "";
        } else {
          e.className = "navbar-burger";
          document.getElementById("navbar").className = "burger-menu";
        }
    });
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener("click", e => {
            if (navigate(link.href)) {
                document.title = "Original Prusa Mini - " + link.innerText;
                history.pushState(null, document.title, link.href);
                e.preventDefault();
            }
        });
    });
    window.onpopstate = e => e && navigate(e.location);
    navigate(window.location.hash || "#dashboard");
};