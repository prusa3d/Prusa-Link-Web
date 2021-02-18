// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const slaHandleError = (status, data) => {
  if (!status.ok) {
    console.error(`Cant get printer API! Error ${status.code}`);
    console.error(data);
  }
};

const mk3HandleError = (status, data) => {
  if (!status.ok) {
    console.error(`Cant get printer API! Error ${status.code}`);
    console.error(data);
  }
};

const miniHandleError = (status, data) => {
  if (!status.ok) {
    console.error(`Cant get printer API! Error ${status.code}`);
    console.error(data);
  }
};

const handleError = (() => {
  if (process.env.TYPE == "mini") return miniHandleError;
  if (process.env.TYPE == "sl1") return slaHandleError;
  if (process.env.TYPE == "mk3") return mk3HandleError;
})();

export default handleError;
