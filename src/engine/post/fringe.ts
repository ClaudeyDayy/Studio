// Removes the white halo left around the characters' outlines by the background cut-out.
// Flood-fills from the transparent area through near-white / semi-transparent pixels (it cannot cross the black outline),
// then eats two more rings of light pixels that touch the new edge. Works in place on RGBA pixel data.
export function defringeData(d: Uint8ClampedArray, w: number, h: number) {
  const n = w * h, out = new Uint8Array(n), q = new Int32Array(n);
  let qh = 0, qt = 0;
  const bg = (i: number) => d[i * 4 + 3] < 250 || Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) > 205;
  for (let i = 0; i < n; i++) if (d[i * 4 + 3] === 0) { out[i] = 1; q[qt++] = i; }
  while (qh < qt) {
    const i = q[qh++], x = i % w;
    if (x > 0 && !out[i - 1] && bg(i - 1)) { out[i - 1] = 1; q[qt++] = i - 1; }
    if (x < w - 1 && !out[i + 1] && bg(i + 1)) { out[i + 1] = 1; q[qt++] = i + 1; }
    if (i >= w && !out[i - w] && bg(i - w)) { out[i - w] = 1; q[qt++] = i - w; }
    if (i < n - w && !out[i + w] && bg(i + w)) { out[i + w] = 1; q[qt++] = i + w; }
  }
  const min3 = new Uint8Array(n);
  for (let i = 0; i < n; i++) min3[i] = Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
  for (let i = 0; i < n; i++) if (out[i]) d[i * 4 + 3] = 0;
  for (let pass = 0; pass < 2; pass++) {
    const kill: number[] = [];
    for (let i = 0; i < n; i++) {
      if (d[i * 4 + 3] === 0 || min3[i] <= 150) continue;
      const x = i % w;
      if ((x > 0 && d[(i - 1) * 4 + 3] === 0) || (x < w - 1 && d[(i + 1) * 4 + 3] === 0) || (i >= w && d[(i - w) * 4 + 3] === 0) || (i < n - w && d[(i + w) * 4 + 3] === 0)) kill.push(i);
    }
    for (const i of kill) d[i * 4 + 3] = 0;
  }
}
