/** Language that is tranlated from */
const DEFAULT_LANGUAGE = 'en_US';
/** File that contains all translations */
const locales = require('./locales/locales.json');
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

/** Translate string into the current language.
 * If you need to pass some parameters, use %(paramName) syntax and pass { paramName: value } into params
 * @param id Element id
 * @param {string} label The String to translate from. Pass everything in string. Do not use variables!
 * @param params Object that contains parameters. For example { paramName: value }
*/
export function translateById(id, label, params) {
    let element = document.getElementById(id);
    if (element) {
        element.innerHTML = translate(label, params);
    } else {
        console.warn(`Element with id "${id}" not found`);
    }
}

/** Translate string into the current language.
 * If you need to pass some parameters, use %(paramName) syntax and pass { paramName: value } into second parameter
 * @param {string} str The String to translate from. Pass everything in string. Do not use variables!
 * @param parameters Object that contains parameters. For example { paramName: value }
*/
export function translate (str, parameters) {
    let word = null;

    if (languages.includes(lang) && str in texts) {
        word = texts[str][langIndex];
    }

    if (word === null) {
        if (lang !== DEFAULT_LANGUAGE) {
            console.warn(`[${lang}] missing translation for "${str.split('\n').join('\\n')}"`);
        }
        word = str;
    }

    if (parameters) {
        let editedWord = word;
        let regex = /%\((.*?)\)/g; // search for %()
        let match;
        while (match = regex.exec(word)) {
            let paramName = word.substr(match.index + 2, match[0].length - 3); // %(parameter) => parameter
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
                console.warn(`missing parameter [${paramName}] in translation for ${str}.`);
            }
        }
        return editedWord;
    }

    return word;
}