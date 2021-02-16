// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

export const loadProperty = (id, name, value) => {
  const div = document.createElement("div");
  div.innerHTML = `<p>${name}</p><p>${value}</p>`;
  document.getElementById(id).appendChild(div);
};

export const handleError = (status, data) => {
  console.log(status.status);
  if (!status.ok) {
    console.error(`Cant get printer API! Error ${status.code}`);
    console.error(data);
  }
};
