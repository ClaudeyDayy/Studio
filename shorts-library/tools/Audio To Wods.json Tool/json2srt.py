import json, sys

MAX_WORDS = 6

def ts(t):
    ms = round(t * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

data = json.load(open(sys.argv[1], encoding="utf-8"))

# find the word list
if isinstance(data, list):
    words = data
elif "words" in data:
    words = data["words"]
else:
    words = [w for seg in data.get("segments", []) for w in seg.get("words", [])]

caps = []
if words:
    for i in range(0, len(words), MAX_WORDS):
        chunk = words[i:i + MAX_WORDS]
        text = " ".join(w.get("word", w.get("text", "")).strip() for w in chunk)
        caps.append((chunk[0]["start"], chunk[-1]["end"], text))
else:
    for seg in data["segments"]:
        caps.append((seg["start"], seg["end"], seg["text"].strip()))

out = [f"{i}\n{ts(s)} --> {ts(e)}\n{t}\n" for i, (s, e, t) in enumerate(caps, 1)]
open(sys.argv[1].rsplit(".", 1)[0] + ".srt", "w", encoding="utf-8").write("\n".join(out))
print(f"Done: {len(caps)} captions")