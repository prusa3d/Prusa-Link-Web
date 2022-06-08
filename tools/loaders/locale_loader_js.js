// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const colors = require('colors');
const { getWordsFromJS, saveWords } = require("./shared");

/** @param {String} source js file content */
module.exports = function (source) {

  //console.log(colors.magenta.bold(this.resourcePath));
  let words = [];

  if (/(import(.*?)translate(.*?)from(.*?)locale_provider)/g.test(source)) {
    words = getWordsFromJS(source);
  }

  saveWords(words);
  return source;
}


