import json
from pathlib import Path

from_dir = Path("~/Downloads").expanduser() / "translations_1.5.0_PCL"
to_dir = Path("./ui/src/locales")

ignore = ["unit.minute"]

for from_file in from_dir.glob('**/*'):
    print(from_file)

    with open(from_file) as f:
        from_data = json.load(f)

    lang = from_file.name[0:2]
    to_file = to_dir / lang / "translation.json"
    with open(to_file) as f:
        to_data = json.load(f)
    
    for session_key in to_data:
        session = to_data[session_key]
        for key in session:
            id = f"{session_key}.{key}"
            if id not in ignore:
                if id in from_data:
                    if session[key] != from_data[id].strip():
                        raise Exception(f'{lang} >> {id}: "{session[key]}" should be "{from_data[id].strip()}"')
                        # print(f'{lang} >> {id}: "{session[key]}" should be "{from_data[id].strip()}"' )
                else:
                    if id not in ["ntf.warn-resin", "ntf.warn-resin-msg"]:
                        raise Exception(f"{lang} >> {id} not found")
    print(f"{lang} >> Done!")
