import json
from faster_whisper import WhisperModel

# Change this to your audio file name if it's different
AUDIO_FILE = "narration.mp3"

model = WhisperModel("small")
segments, _ = model.transcribe(AUDIO_FILE, word_timestamps=True)

words = [
    {"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)}
    for seg in segments for w in seg.words
]

json.dump(words, open("words.json", "w"), indent=1)
print(f"{len(words)} words, ends at {words[-1]['e']}s")
