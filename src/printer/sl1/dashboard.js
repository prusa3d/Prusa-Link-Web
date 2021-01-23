// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const load = () => {
    console.log("Dashboard Logic - sl1");
    const template = document.getElementById("graph-template");
    const node = document.importNode(template.content, true);
    document.getElementById("graph").appendChild(node);
}

export default { load };