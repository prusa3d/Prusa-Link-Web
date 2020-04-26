// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

// usage:
// node ./scripts/extractLang.js [key1] [key2] ...
// ex:  node ./scripts/extractLang.js exp-times.exp-time exp-times.inc

const fs = require("fs");
const https = require("https");

function extractKeys() {
  const data = JSON.parse(
    fs.readFileSync("ui/src/locales/en/translation.json", "utf8")
  );
  const english_key = {};
  const args = process.argv.slice(2);
  args.forEach(key => {
    const keys = key.split(".");
    english_key[data[keys[0]][keys[1]]] = keys;
  });
  return english_key;
}

function createRegex(english_key) {
  const keys = Object.keys(english_key)
    .join("|")
    .replace(/[.*+?^${}()[\]\\]/g, "\\$&");
  return new RegExp(
    `<source>(${keys})</source>\\s+<translation.*>(.*)</translation>`,
    "g"
  );
}

(function main() {
  try {
    const locales_in = ["cz", "de", "en", "es", "fr", "it", "pl"];
    const locales_out = ["cs", "de", "en", "es", "fr", "it", "pl"];
    const english_key = extractKeys();
    const regex = createRegex(english_key);

    for (let i = 0; i < locales_in.length; i++) {
      const url_in = `https://gitlab.com/prusa3d/sl1/touch-ui/-/raw/master/translations/lang_${locales_in[i]}.ts`;
      const url_out = `ui/src/locales/${locales_out[i]}/translation.json`;
      https
        .get(url_in, res => {
          let data = "";
          res.on("data", d => {
            data = data + d.toString();
          });

          res.on("end", () => {
            const translations = JSON.parse(fs.readFileSync(url_out, "utf8"));
            const matches = data.matchAll(regex);
            for (const match of matches) {
              const keys = english_key[match[1]];
              translations[keys[0]][keys[1]] = match[2].replace("&apos;", "'");
            }
            const ordered = {};
            Object.keys(translations)
              .sort()
              .forEach(function(key) {
                const ordered_inside = {};
                const unordered = translations[key];
                Object.keys(unordered)
                  .sort()
                  .forEach(function(key2) {
                    ordered_inside[key2] = unordered[key2];
                  });
                ordered[key] = ordered_inside;
              });
            const contents = JSON.stringify(ordered, null, 2) + "\n";
            fs.writeFile(url_out, contents, "utf8", err => {
              if (err) throw err;
              console.log(url_out + "  ->  Done");
            });
          });
        })
        .on("error", e => {
          console.error(e);
        });
    }
  } catch (err) {
    console.error(err);
  }
})();
