// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later
const { getWordsFromHTML, saveWords } = require("./shared");

/** @param {String} source html file content */
module.exports = function (source) {

  //console.log(colors.cyan.bold(this.resourcePath));
  const words = getWordsFromHTML(source);
  saveWords(words);
  return source;
}


