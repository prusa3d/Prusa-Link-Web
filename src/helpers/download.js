// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The function displays a save file dialog and then downloads the file from the destination URL.
 * @param {string} url Target url
 * @param {string?} name Default name of the file in dialog
 */
function download(url, name) {
  let a = document.createElement('a');
  a.href = url;
  a.download = name || "";
  a.click();
  a.remove();
}

export default download;
