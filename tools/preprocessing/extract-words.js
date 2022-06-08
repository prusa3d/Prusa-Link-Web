const fs = require("fs");
const path = require("path");
const {getWordsFromHTML, getWordsFromJS} = require('../loaders/shared.js');

const WORDS_FILE = path.resolve(__dirname, "../../src/locales/c.json");

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

function main() {
    const jsFiles = readDirRecursive(JS_SRC, ".js");
    const htmlFiles = readDirRecursive(HTML_SRC, ".html");

    const initial = (fs.existsSync(WORDS_FILE)) ? `${fs.readFileSync(WORDS_FILE)}` : null;
    const words = JSON.stringify(
        Object.fromEntries([
            ...readWordsFromFiles(jsFiles, getWordsFromJS),
            ...readWordsFromFiles(htmlFiles, getWordsFromHTML),
        ]
            .filter(w => !!w)
            .sort()
            .map(key => [key, ""])
        ),
        undefined,
        2
    );

    fs.writeFileSync(WORDS_FILE, words);

    if (initial !== words) {
        console.warn("Words file was not up to date!");
        return 1;
    }
    return 0;
}

process.exit(main());
