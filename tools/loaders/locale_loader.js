const fs = require("fs");
const path = require("path");
const colors = require('colors');
//const getNestedValue = require("./get_nested_value");

const output_file = path.resolve(__dirname, "../../src/locales/locales.json");
const source_dir = path.resolve(__dirname, "../../src/locales/source");

// init
removeFile(output_file);
const languages = fs.readdirSync(source_dir)
  .map(fileName => fileName.replace('.json', '')); // => [ 'cs', 'de', 'it' ]

/** @param {String} source js file content */
module.exports = function (source) {

  let words = [];

  if (/(import(.*?)translate(.*?)from(.*?)locale_provider)/g.test(source)) {
    words = getWords(source);
  }

  if (words.length > 0) {
    let content = new Object();

    if (fs.existsSync(output_file)) {
      content = JSON.parse(fs.readFileSync(output_file).toString());
    } else {
      content = {
        langs: languages,
        texts: {},
      }
    }

    words.forEach(word => { // printer.button.cancel
      let keys = word.split("."); // ["printer", "button", "cancel"]
      let lastKey = keys[keys.length - 1]; // "cancel"

      /* reference to request key (without last) in content object.
       * if we want to translate "printer.btn.cancel", ref will be "printer.btn" */
      let ref = createHierarchy(content["texts"], keys.slice(0, keys.length - 1));

      if (!ref[lastKey]) { // printer["button"]["cancel"]
        let translations = languages.map(lang => {
          const file = require(path.resolve(source_dir, `${lang}.json`));
          const translation = getNestedValue(file, word);
          if (translation === undefined) {
            console.log(colors.red.bold(`[${lang}] missing translation for "${
              word.split('\n').join('\\n')}"`));
          }
          return translation;
        });

        ref[lastKey] = translations;
      }
    })

    // json is overriden
    writeJson(output_file, JSON.stringify(content));
  }

  return source;
}

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

/* TODO: duplicate of src/helpers/get_nested value.
Is there a way how to share that function? */
function getNestedValue(object, path) {
  let keys = path.split(".");
  let obj = object;
  for (const key of keys) {
    obj = obj[key];
    if (!obj)
      break;
  }
  return obj;
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

function writeJson(path, data) {
  fs.writeFileSync(path, data);
}

function removeFile(path) {
  if (fs.existsSync(path))
    fs.unlinkSync(path);
}