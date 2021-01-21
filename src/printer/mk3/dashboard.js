const load = () => {
    console.log("Dashboard Logic - mk3");
    const template = document.getElementById("graph-template");
    const node = document.importNode(template.content, true);
    document.getElementById("graph").appendChild(node);
}

export default { load };