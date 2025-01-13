// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const colors = require("colors");
const fs = require("fs");
const path = require("path");

const output_file = path.resolve(__dirname, "../../src/locales/locales.json");
const source_dir = path.resolve(__dirname, "../../src/locales/source");

const languages = fs.readdirSync(source_dir)
  .map(fileName => fileName.replace('.json', '')); // => [ 'cs', 'de', 'it' ]

let count = 0;

const loader_module = {
  getWordsFromHTML,
  getWordsFromJS,
  saveWords,
};

/** Create hierarchy in object, return last property */
function createHierarchy(object, keys) {
  if (keys.length > 0) {
    let o = object[keys[0]];
    if (o === undefined)
      o = object[keys[0]] = new Object();

    keys.shift();
    return createHierarchy(o, keys);
  } else {
    return object;
  }
}

function getJsonFromFile(fileName, getFallback) {
  return fs.existsSync(fileName)
    ? JSON.parse(fs.readFileSync(fileName).toString())
    : getFallback();
}

function getContent() {
  return getJsonFromFile(output_file, () => ({
    langs: languages,
    texts: {},
  }));
}

function writeJson(path, data) {
  fs.writeFileSync(path, data);
}

function removeFile(path) {
  if (fs.existsSync(path))
    fs.unlinkSync(path);
}

function saveWords(words) {
  if (words.length > 0) {
    if (count == 0) {
      // We don't have information about printer config while initializing, so we remove json here.
      console.log(colors.yellow.bold("remove: " + output_file));
      removeFile(output_file);
    }
    count ++;

    let content = getContent();

    words.forEach((word) => {
      // printer.button.cancel
      let keys = word.split("."); // ["printer", "button", "cancel"]
      let lastKey = keys[keys.length - 1]; // "cancel"

      /* reference to request key (without last) in content object.
       * if we want to translate "printer.btn.cancel", ref will be "printer.btn" */
      let ref = createHierarchy(
        content["texts"],
        keys.slice(0, keys.length - 1)
      );

      let missing = [];
      if (!ref[lastKey]) {
        // printer["button"]["cancel"]
        let translations = languages.map((lang) => {
          const file = require(path.resolve(source_dir, `${lang}.json`));
          const translation = file[word];
          if (translation === undefined)
            missing.push(lang);
          return translation;
        });

        if (missing.length > 0)
          logMissingTranslation(word, missing, languages);

        ref[lastKey] = translations;
      }
    });

    writeJson(output_file, JSON.stringify(content));
  }
}

function logMissingTranslation(word, missing, languages) {
  const m = languages.map((lang) => {
    if (missing.includes(lang)) {
      return colors.red.bold(lang);
    } else {
      return colors.green(lang);
    }
  });

  // for example: [cs, de, en, es, fr, it, pl] missing translation for "btn.cancel"
  console.log(
    `\n[${m.join(", ")}]`
    + colors.red(" missing translation for ")
    + colors.red.bold(`"${word.split('\n').join('\\n')}"`)
  );
}

function getWordsFromHTML(source) {
  let words = [];

  let regex = /data-label=\"(.*?)\"/g
  let result = source.match(regex);
  let extended = false; // also parse template macros

  if (result) {
    for (let match of result) { // data-label="prop.time-est"
      let word = match.replace("data-label=", "").trim(); // remove data-label=
      word = word.substr(1, word.length - 2); // remove quotes
      word = word.replace(/(\\")/g, '"'); // replace /" with "
      word = word.replace(/(\\n)/g, '\n'); // fix problems with \n characters
      if (word.startsWith('{{')) {
        extended = true;
      } else {
        words.push(word);
      }
    }
  }

  if (extended) {
    regex = /label: \'(.*?)\'/g
    result = source.match(regex);
      
    if (result) {
      for (let match of result) { // label: 'prop.time-est'
        let word = match.replace("label: ", "").trim(); // remove label: 
        word = word.substr(1, word.length - 2); // remove quotes
        word = word.replace(/(\\')/g, '"'); // replace /" with "
        word = word.replace(/(\\n)/g, '\n'); // fix problems with \n characters
        words.push(word);
      }
    }
  }
  
  return words;
}

function getWordsFromJS(source) {
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

module.exports = loader_module;
