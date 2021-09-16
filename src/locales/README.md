Update translations

1. Create new keys in `source/en.json`.
2. Send updated `source/en.json` to the translators.
3. All languages has to be exported from PhraseApp in format `React-Intl Nested JSON`.
4. Copy new files in the `source` folder. The files should be named `cs_CZ.json`, `es_ES.json` etc.
5. run `update_tranlsations.py`. It takes `source/en.json` as template what groups has to be updated.
6. Check new keys are present in all languages. This can be done by running the UI `npm run start:sl1`.
7. Delete files `cs_CZ.json` etc.
