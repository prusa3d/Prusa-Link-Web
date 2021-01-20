import printer from "./printer";

const navigate = (url) => {
    const [_, page] = url.split("#");
    if (!page) return false;    
    const route = printer.routes.find(r => r.path === page);
    if (!route) return false;
    const root = document.getElementById("root");
    root.innerHTML = '';
    (new DOMParser()).parseFromString(route.html, "text/html").body.childNodes.forEach(
        n => root.appendChild(n)
    );
    route.module.load();
    return true;
};

export { navigate };