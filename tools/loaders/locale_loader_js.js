// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later


const colors = require('colors');
const { saveWords } = require("./shared");

/** @param {String} source js file content */
module.exports = function (source) {

  //console.log(colors.magenta.bold(this.resourcePath));
  let words = [];

  if (/(import(.*?)translate(.*?)from(.*?)locale_provider)/g.test(source)) {
    words = getWords(source);
  }

  saveWords(words);
  return source;
}

function getWords(source) {
  /* search for: translate('Some word') | translate("Some word")
   * translate(`Some word`) | translate( 'Some_word ', {param: 32}) | ... */
  let regex = /translate\(\s*(?:'|"|`)\s*(.*?)\s*(?:'|"|`)\s*(?:,|\))/g
  let result = source.match(regex);
  let words = [];

  if (result) {
    for (let match of result) {
      let word = match.replace('translate', '').trim(); // remove translate word
      word = word.substr(1, word.length - 2).trim(); // remove ()
      word = word.substr(1, word.length - 2); // remove quotes
      word = word.replace(/(\\")/g, '"'); // replace /" with "
      word = word.replace(/(\\n)/g, '\n'); // fix problems with \n characters
      words.push(word);
    }
  }

  return words;
}