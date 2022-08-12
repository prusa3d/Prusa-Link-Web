const fs = require("fs");
const path = require("path");
const {getWordsFromHTML, getWordsFromJS} = require('../loaders/shared.js');

const WORDS_FILE = path.resolve(__dirname, "../../src/locales/c.json");
const WORDS_DIR = path.resolve(__dirname, "../../src/locales/");

const JS_SRC = 'src/';
const HTML_SRC = 'templates/';

const readDirRecursive = (dir, extension) => {
    return fs.readdirSync(dir).flatMap(fileName => {
        const filePath = path.join(dir, fileName);
        if (filePath.endsWith(extension)) {
            return [filePath];
        }
        if (fs.statSync(filePath).isDirectory()) {
            return readDirRecursive(filePath, extension);
        }
        return [];
    });
}

const readWordsFromFiles = (files, getWordsFrom) => {
    return files.flatMap(filePath => getWordsFrom(`${fs.readFileSync(filePath)}`));
}

const stringifyWords = (words) => {
    return JSON.stringify(words, undefined, 2);
}

function main() {
    let isSync = true;
    const jsFiles = readDirRecursive(JS_SRC, ".js");
    const htmlFiles = readDirRecursive(HTML_SRC, ".html");
    const wordsFiles = readDirRecursive(WORDS_DIR, ".json").filter(fn => !fn.endsWith('c.json'));

    const initial = (fs.existsSync(WORDS_FILE)) ? `${fs.readFileSync(WORDS_FILE)}` : null;
    const words = Object.fromEntries([
        ...readWordsFromFiles(jsFiles, getWordsFromJS),
        ...readWordsFromFiles(htmlFiles, getWordsFromHTML),
    ]
        .filter(w => !!w)
        .sort()
        .map(key => [key, ""])
    );

    wordsFiles.forEach(fileName => {
        // const filePath = path.join(WORDS_DIR, fileName);
        const langWords = JSON.parse(fs.readFileSync(fileName));
        Object.keys(words).forEach(key => {
            if (!(key in langWords)) {
                langWords[key] = "";
                isSync = false;
            }
        })
        fs.writeFileSync(fileName, stringifyWords(langWords));
    });

    const result = stringifyWords(words);
    fs.writeFileSync(WORDS_FILE, result);

    if (!isSync) {
        console.warn("Words file was not up to date!");
        return 1;
    }
    return 0;
}

process.exit(main());
