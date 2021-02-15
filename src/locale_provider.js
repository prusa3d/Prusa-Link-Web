/** Language that is tranlated from */
const DEFAULT_LANGUAGE = "en";
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

setLanguage(DEFAULT_LANGUAGE);
console.log(`known languages: ${languages} (+ ${DEFAULT_LANGUAGE})`);
console.log(`known texts: `);
console.log(texts);

/** Set current language */
export function setLanguage(language) {
    lang = language;
    langIndex = languages.indexOf(lang);
}

/** Translate text into the current language. If you need to pass some parameters,
 * use %(paramName) in text and pass { paramName: value } into parameters. Use query
 * parameter if you need to pass result into HTML element. "query" parameter is reserved
 * and is not passed to the text.
 * @param {string} text The text to translate from. Must be simple strin. Do not use variables!
 * @param {{query?:any}|undefined} parameters Object that contains parameters.
 * query = where to insert the translation; Other parameters will be passed to given string
 * @return {string}
*/
export function translate(text, parameters) {
    let word = null;

    if (languages.includes(lang) && text in texts) {
        word = texts[text][langIndex];
    }

    if (word === null) {
        if (lang !== DEFAULT_LANGUAGE) {
            console.warn(`[${lang}] missing translation for "${text.split("\n").join("\\n")}"`);
        }
        word = text;
    }

    // Check for parameters, ignore query
    const haveParams = typeof parameters === "object" && (
        Object.keys(parameters).length > 1 || !("query" in parameters)
    );

    if (haveParams) {
        let editedWord = word;
        let regex = /%\((.*?)\)/g; // search for %()
        let match;
        while (match = regex.exec(word)) {
            // %(parameter) => parameter
            let paramName = word.substr(match.index + 2, match[0].length - 3);
            if (paramName === "query") continue;
            if (paramName in parameters) {
                let param = parameters[paramName];
                // Checks for float digis suffix
                const suffix = word.substr(regex.lastIndex, 3); // .1f
                if (/.[0-9]f/g.test(suffix)) { // .1f
                    let digis = parseInt(suffix[1]);
                    editedWord = editedWord.split(match[0] + suffix).join(param.toFixed(digis));
                } else {
                    editedWord = editedWord.replace(match[0], param);
                }
            } else {
                console.warn(`missing parameter [${paramName}] in translation for ${text}.`);
            }
        }
        word = editedWord;
    }

    if (parameters && parameters["query"])
        setText(parameters.query, word);

    return word;
}

function setText(query, text) {
    let element = document.querySelector(query);
    if (element) {
        element.innerHTML = text;
        console.log(element);
    } else {
        console.warn(`cannot find element with "${query}" query`);
    }
}