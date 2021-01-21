import "./styles.css";
import { navigate } from "./router.js";

window.onload = () => {

  document.getElementById("menu").addEventListener("click", (e) => {
    const menu = document.getElementById("menu");
    if (menu.className == "navbar-burger") {
      menu.className = "navbar-burger burger-open";
      document.getElementById("navbar").className = "";
    } else {
      menu.className = "navbar-burger";
      document.getElementById("navbar").className = "burger-menu";
    }
  });
  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (navigate(link.href)) {
        document.title = "Original Prusa Mini - " + link.innerText;
        history.pushState(null, document.title, link.href);
        e.preventDefault();
      }
    });
  });
  window.onpopstate = (e) => e && navigate(e.location);
  navigate(window.location.hash || "#dashboard");
};