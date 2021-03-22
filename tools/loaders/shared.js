// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const colors = require("colors");
const fs = require("fs");
const path = require("path");
const getNestedValue = require("../../src/helpers/get_nested_value");

const output_file = path.resolve(__dirname, "../../src/locales/locales.json");
const source_dir = path.resolve(__dirname, "../../src/locales/source");

const languages = fs.readdirSync(source_dir)
  .map(fileName => fileName.replace('.json', '')); // => [ 'cs', 'de', 'it' ]

let count = 0;

const loader_module = {
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

function getContent() {
  let content = new Object();

  if (fs.existsSync(output_file)) {
    content = JSON.parse(fs.readFileSync(output_file).toString());
  } else {
    content = {
      langs: languages,
      texts: {},
    }
  }

  return content;
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

      if (!ref[lastKey]) {
        // printer["button"]["cancel"]
        let translations = languages.map((lang) => {
          const file = require(path.resolve(source_dir, `${lang}.json`));
          const translation = getNestedValue(file, word);
          if (translation === undefined) {
            console.log(colors.red.bold(`[${lang}] missing translation for "${word.split('\n').join('\\n')}"`));
          }
          return translation;
        });

        ref[lastKey] = translations;
      }
    });

    if (count == 0) {
      // We don't have information about printer config while initializing, so we remove json here.
      console.log("remove: " + output_file);
      removeFile(output_file);
    }
    count ++;

    writeJson(output_file, JSON.stringify(content));
  }
}

module.exports = loader_module;
