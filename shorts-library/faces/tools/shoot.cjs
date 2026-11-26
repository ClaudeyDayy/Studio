const puppeteer = require("/opt/npm-tools/node_modules/puppeteer");
const fs = require("fs");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1080, height: 1920 });
  await p.setContent(`<html><body style="margin:0"><script>${fs.readFileSync(process.argv[2], "utf8")}</script></body></html>`);
  const mode = process.argv[3];
  if (mode === "sheet") { const d = await p.evaluate(() => sheet()); fs.writeFileSync("out/sheet.png", Buffer.from(d.split(",")[1], "base64")); }
  else {
    const names = ["neutral","content","neutral","happy","satisfied","strain","angry","stressed","sad","scared","surprised","confused","neutral"];
    const track = [{t:0,e:"neutral"},{t:0.8,e:"neutral",look:-1},{t:1.6,e:"neutral",look:1},{t:2.4,e:"neutral",look:0}, ...names.slice(1).map((e, i) => ({ t: 3.2 + i * 1.0, e }))];
    fs.mkdirSync("out/fr", { recursive: true });
    const T = 3.2 + (names.length - 1) * 1.0 + 0.6, F = Math.round(T * 30);
    for (let f = 0; f < F; f++) { const d = await p.evaluate((t, tr) => frame(t, tr), f / 30, track); fs.writeFileSync(`out/fr/f${String(f).padStart(4,"0")}.jpg`, Buffer.from(d.split(",")[1], "base64")); }
  }
  await b.close();
})();
