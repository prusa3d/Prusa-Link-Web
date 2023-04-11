require('dotenv').config();

const fs = require("fs");
const path = require("path");
const { createApiClient } = require('./prusalator/apiClient')
const {getWordsFromHTML, getWordsFromJS} = require('../loaders/shared.js');

const WORDS_FILE = path.resolve(__dirname, "../../src/locales/c.json");
const WORDS_DIR = path.resolve(__dirname, "../../src/locales/source");

const JS_SRC = 'src/';
const HTML_SRC = 'templates/';
const PRUSALATOR_UNSUPPORTED = ["kr", "sk", "nl", "lt"];


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

const main = async (ci = false) => {
    const serverUrl = process.env.PRUSALATOR_SERVER;
    const projectId = process.env.PRUSALATOR_PROJECT_ID;
    const token = process.env.PRUSALATOR_TOKEN;

    if (!serverUrl || !projectId || !token) {
        console.error("Prusalator is not configured");
        return -1;
    }

    const apiClient = createApiClient({serverUrl, projectId, token});
    
    const jsFiles = readDirRecursive(JS_SRC, ".js");
    const htmlFiles = readDirRecursive(HTML_SRC, ".html");
    const wordsFiles = readDirRecursive(WORDS_DIR, ".json").filter(
        fn => fn.endsWith('.json') && fn !== 'c.json'
    );

    const words = Object.fromEntries([
        ...readWordsFromFiles(jsFiles, getWordsFromJS),
        ...readWordsFromFiles(htmlFiles, getWordsFromHTML),
    ]
        .filter(w => !!w)
        .sort()
        .map(key => [key, ""])
    );

    const isSync = await Promise.all(wordsFiles.map(async fileName => {
        let isSync = true;
        const langWords = JSON.parse(fs.readFileSync(fileName));
        const localeName = path.parse(fileName).name;
        let remoteWords = [];

        try {
            const remoteLocale = await apiClient.pull(localeName);
            if (remoteLocale.data) {
                remoteWords = remoteLocale.data;
            }
        } catch (e) {
            console.error(`Failed to pull ${localeName} locale`, e?.response?.data?.message);
            isSync = false;
        }
        
        const missingRemoteWords = [];
        let updatesCount = 0;

        // add new keys
        Object.keys(words).forEach(key => {
            // to local
            if (!(key in langWords)) {
                langWords[key] = "";
                isSync = false;
            }

            const remoteEntry = remoteWords.find(entry => entry.name === key);

            // to remote
            if (remoteEntry) {
                // source of truth
                const translation = remoteEntry.translations[0];
                if (translation && langWords[key] !== translation.content) {
                    langWords[key] = translation.content;
                    isSync = false;
                    updatesCount += 1;
                }
            } else {
                missingRemoteWords.push({
                    key,
                    content: langWords[key],
                });
                isSync = false;
            }
        });

        if (!PRUSALATOR_UNSUPPORTED.includes(localeName)) {
            if (!ci && missingRemoteWords.length > 0) {
                try {
                    await apiClient.push(localeName, { data: JSON.stringify(missingRemoteWords) });
                } catch(e) {
                    isSync = false;
                    console.error(`Failed to push ${localeName} words:`, e?.response?.data?.message);
                }
            }
        }

        // ignore locales unsupported by prusalator
        const ignore = PRUSALATOR_UNSUPPORTED.includes(localeName);
        const state = isSync ? 'clean' : (ignore ? 'ignore' : 'dirty');

        console.log(`${localeName} (${state}):`)
        console.log(`  - ${missingRemoteWords.length} translations were missing in Prusalator`);
        console.log(`  - ${updatesCount} translations has been pulled from Prusalator`);

        fs.writeFileSync(fileName, stringifyWords(langWords));

        return ignore || isSync;
    }));

    const result = stringifyWords(words);
    fs.writeFileSync(WORDS_FILE, result);

    if (isSync.includes(false)) {
        return 1;
    }
    return 0;
};

// is it running in CI
const ci = !!process.argv.find(arg => arg === '--ci');
main(ci).then(r => {
    process.exit(r)
});
