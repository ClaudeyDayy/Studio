// Captions from word timings (words.json: [{ "w": "Hello", "s": 0.10, "e": 0.42 }, ...]).
// 1-2 words per caption, a new caption after . ? ! or ,
export type Word = { w: string; s: number; e: number };
export type Cap = { a: number; b: number; text: string };

export function capsFromWords(words: Word[], maxWords = 2): Cap[] {
  const out: Cap[] = [];
  let cur: Word[] = [];
  const flush = () => { if (cur.length) { out.push({ a: cur[0].s, b: cur[cur.length - 1].e, text: cur.map((w) => w.w).join(" ") }); cur = []; } };
  for (const w of words) {
    cur.push(w);
    if (cur.length >= maxWords || /[.?!,]$/.test(w.w)) flush();
  }
  flush();
  for (let i = 0; i < out.length; i++) out[i].b = Math.max(out[i].b, Math.min((out[i + 1]?.a ?? out[i].b + 0.4), out[i].b + 0.35));
  return out;
}
// end of the last word (use as the video length when the video follows a voice-over)
export const wordsEnd = (words: Word[]) => (words.length ? words[words.length - 1].e : 0);
