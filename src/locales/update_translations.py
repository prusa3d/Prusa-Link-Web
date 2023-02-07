import os
import json

path = os.path.dirname(os.path.realpath(__file__)) + "/source/"
languages = [
    ("en","en_US"),     # this is used to get all groups
    ("cs","cs_CZ"),
    ("sk","sk_SK"),
    ("pl","pl_PL"),
    ("de","de_DE"),
    ("es","es_ES"),
    ("fr","fr_FR"),
    ("it","it_IT"),
    ("kr","kr_KR"),
    ("nl","nl-NL")
]
new_file = dict()
for language in languages:
    with open(os.path.join(path + language[1] + ".json"), "r") as g:
        translation_file = json.loads(g.read())
    with open(os.path.join(path + languages[0][0] + ".json"), "r") as f:
        en_file = json.loads(f.read())

    for group, data in en_file.items():
        new_file.update({group: translation_file[group]})

    with open(os.path.join(path + language[0] + ".json"), 'w', encoding='utf8') as out:
        json.dump(new_file, out, indent=2, sort_keys=True, ensure_ascii=False)
        out.write("\n")  # Add newline cause Py JSON does not
