import getNestedValue from "./helpers/get_nested_value";

/** File that contains all translations */
const locales = require("./locales/locales.json");
/** All known languages */
const languages = locales.langs;
/** All known texts */
const texts = locales.texts;

/** Current language */
let lang;
/** Index of current language in languages array. */
let langIndex;

setLanguage(localStorage.getItem("lang"))
  || setLanguage(detectBrowserLang().toLowerCase())
  || setLanguage(detectBrowserLang().toLowerCase().split("-")[0]) // en-GB as en
  || setLanguage("en");

console.log(`known languages: ${languages}`);
console.log(`known texts: `);
console.log(texts);

function detectBrowserLang() {
  return navigator.language || navigator.userLanguage || "";
}

/** Set current language. Return false if language is not available. You need to
 * manually refresh page. */
export function setLanguage(language) {
  const index = languages.indexOf(language);
  if (index === -1)
    return false;

  langIndex = index;
  lang = language;
  localStorage.setItem("lang", lang);
  return true;
}

/** Get current language */
export function getLanguage() {
  return lang;
}

/** Get available languages */
export function getLanguages() {
  return [...languages];
}

/** Translate text into the current language. Parameters {{paramName}} will be
 * replaced with { paramName: value } from parameters. Use query or ref parameter if
 * you need to pass result into HTML element. "query" and "ref" parameters are reserved
 * and not passed into the text.
 * @param {string} textId Text id. For example "button.ok". Must be simple string.
 * Do not use variables!
 * @param {{query?:any, ref?:any}|undefined} parameters Object that contains parameters.
 * query or ref = where to insert the translation; Other parameters will be passed to given string
 * @return {string}
*/
export function translate(textId, parameters) {
  let word = getNestedValue(texts, `${textId}.${langIndex}`);

  if (word === null || word === undefined) {
    word = textId;
    console.warn(`[${lang}] missing translation for "${textId.split("\n").join("\\n")}"`);
    assign(word, parameters);
    return word;
  }

  // Check for parameters, ignore query and ref
  let params = null;
  if (parameters) {
    params = Object.assign({}, parameters);
    delete params["query"];
    delete params["ref"];
  }

  if (params && Object.keys(params).length > 0) {
    let editedWord = word;
    let regex = /{{(.*?)}}/g; // search for {{}}
    let match;
    while (match = regex.exec(word)) {
      // {{parameter}} => parameter
      let paramName = word.substr(match.index + 2, match[0].length - 4);
      if (paramName === "query" || paramName === "ref") continue;
      if (paramName in parameters) {
        let param = parameters[paramName];
        editedWord = editedWord.replace(match[0], param);
      } else {
        console.warn(`missing parameter [${paramName}] in translation for ${textId}.`);
      }
    }
    word = editedWord;
  }

  assign(word, parameters);
  return word;
}

function assign(word, parameters) {
  if (parameters) {
    if (parameters.ref) {
      let element = parameters.ref;
      element.innerHTML = word;
    } else if (parameters.query) {
      let element = document.querySelector(parameters.query);
      if (element) {
        element.innerHTML = word;
      } else {
        console.warn(`cannot find element with "${parameters.query}" query`);
      }
    }
  }
}