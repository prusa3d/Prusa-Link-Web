const fs = require("fs");
const path = require("path");
const colors = require('colors');

const output_file = path.resolve(__dirname, "../../src/locales/locales.json");
const source_dir = path.resolve(__dirname, "../../src/locales/source");

// init
removeFile(output_file);
const languages = fs.readdirSync(source_dir).map(fileName => fileName.replace('.json', '')); // => [ 'cs_CZ', 'de_DE', 'it_IT' ]

/** @param {String} source js file content */
module.exports = function (source) {

    let words = [];

    if (/(import(.*?)translateById(.*?)from(.*?)locale_provider)/g.test(source)) {
        words = getWordsFromTranslateById(source);
    }

    if (/(import(.*?)translate(.*?)from(.*?)locale_provider)/g.test(source)) {
        words = words.concat(getWordsFromTranslate(source));
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

        words.forEach(word => {
            if (!(word in content['texts'])) {
                content['texts'][word] = [];

                languages.forEach(lang => {
                    const file = require(path.resolve(source_dir, `${lang}.json`));

                    if (word in file) {
                        content['texts'][word].push(file[word]);
                    } else {
                        content['texts'][word].push(null);
                        console.log(colors.red.bold(`[${lang}] missing translation for "${word.split('\n').join('\\n')}"`));
                    }
                });
            }
        })

        // json is overriden
        writeJson(output_file, JSON.stringify(content));
    }

    return source;
}

function getWordsFromTranslateById(source) {
    let regex = /translateById\(\s*(.*?)\)/g;
    let result = source.match(regex);
    let words = [];

    for (let match of result) {
        let word = match.replace('translateById', '').trim(); // remove translateById word
        word = word.substr(1, word.length - 2).trim(); // remove ()
        word = word.split(',')[1].trim(); // get second parameter
        word = word.substr(1, word.length - 2); // remove quotes
        word = word.replace(/(\\")/g, '"'); // replace /" with "
        word = word.replace(/(\\n)/g, '\n'); // fix problems with \n characters
        words.push(word);
    }

    return words;
}

function getWordsFromTranslate(source) {
    // search for: translate('Some word') | translate("Some word") | translate(`Some word`) | translate( 'Some_word ', {param: 32}) | ...
    let regex = /translate\(\s*(?:'|"|`)(.*?)(?:'|"|`)(?:,|\s*\))/g
    let result = source.match(regex);
    let words = [];

    for (let match of result) {
        let word = match.replace('translate', '').trim(); // remove translate word
        word = word.substr(1, word.length - 2).trim(); // remove ()
        word = word.substr(1, word.length - 2); // remove quotes
        word = word.replace(/(\\")/g, '"'); // replace /" with "
        word = word.replace(/(\\n)/g, '\n'); // fix problems with \n characters
        words.push(word);
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