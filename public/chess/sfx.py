# Synthesized sound effects for "Infinite chess" v3.1 (no samples, no services). Writes a 48 kHz stereo WAV.
# v3.1: the glass-dome sounds are gone; both fantasy exits = falling whoosh (pull back) + falling shimmer (white),
# then a soft falling whoosh as the café camera pulls back out of Max's head.
import numpy as np, scipy.signal as ss, scipy.io.wavfile as wf, sys
SR = 48000; DUR = 2018 / 30; N = int(DUR * SR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)
def put(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR); j = min(N, i + len(sig))
    if i >= N or j <= i: return
    s = sig[:j - i] * gain
    L[i:j] += s * np.sqrt(0.5 * (1 - pan)); R[i:j] += s * np.sqrt(0.5 * (1 + pan))
def env(n, a, d):  # attack/decay in seconds
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4)); return e
def bp(x, lo, hi, order=2): b, a = ss.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band'); return ss.lfilter(b, a, x)
def lp(x, f, order=2): b, a = ss.butter(order, f / (SR / 2)); return ss.lfilter(b, a, x)
def hp(x, f, order=2): b, a = ss.butter(order, f / (SR / 2), 'high'); return ss.lfilter(b, a, x)
def noise(sec): return rng.standard_normal(int(sec * SR))
def tone(f, sec, kind='sin'):
    t = np.arange(int(sec * SR)) / SR; ph = 2 * np.pi * (np.cumsum(np.broadcast_to(f, t.shape)) / SR if np.ndim(f) else f * t)
    return np.sin(ph)

# --- building blocks ---
def wood_click(pitch=1.0):
    n = int(0.12 * SR); t = np.arange(n) / SR
    body = sum(np.sin(2 * np.pi * f * pitch * t) * np.exp(-t / d) for f, d in [(1850, .018), (2900, .01), (900, .03)])
    tick = bp(noise(0.12), 2000, 7000) * np.exp(-t / 0.004)
    return 0.6 * body + 0.5 * tick
def pick_tick(): return 0.35 * wood_click(1.35)
def whoosh(sec, up=True, bright=1.0):
    x = noise(sec); n = len(x); t = np.linspace(0, 1, n)
    shape = np.sin(np.pi * t) ** 2
    # moving band: sweep the centre frequency
    out = np.zeros(n); seg = 2048
    for k in range(0, n, seg):
        u = k / n; fc = (300 + 2200 * (u if up else 1 - u)) * bright
        out[k:k + seg] = bp(x[k:k + seg], fc * 0.6, min(fc * 1.6, 18000), 1)
    return lp(out, 6000) * shape
def swish(): return 0.5 * whoosh(0.32, True, 1.6)
def shimmer(sec, rise=True):
    n = int(sec * SR); t = np.arange(n) / SR; out = np.zeros(n)
    notes = [523, 659, 784, 988, 1175, 1319, 1568, 1976]
    if not rise: notes = notes[::-1]
    for k, f in enumerate(notes):
        st = int(k / len(notes) * sec * 0.7 * SR); m = n - st; tt = np.arange(m) / SR
        out[st:] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.5) * 0.25
    return out * np.minimum(1, t / 0.02)
def chime(f, d=1.2):
    n = int(d * SR); t = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d / (1 + 2 * k))) for k, (m, a) in enumerate([(1, .6), (2.76, .25), (5.4, .1)]))
def pop():
    n = int(0.09 * SR); t = np.arange(n) / SR; f = 900 * np.exp(-t / 0.02) + 180
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.025)
def boom():
    n = int(0.9 * SR); t = np.arange(n) / SR; f = 120 * np.exp(-t / 0.15) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.3) + 0.3 * lp(noise(0.9), 400) * np.exp(-t / 0.08)
def tick(): n = int(0.03 * SR); t = np.arange(n) / SR; return bp(noise(0.03), 2500, 6000) * np.exp(-t / 0.004) + 0.4 * np.sin(2 * np.pi * 3200 * t) * np.exp(-t / 0.006)
def ding(): return chime(1568, 1.6)
def clink(): a = 0.5 * chime(2637, 0.35); b = 0.3 * chime(3951, 0.25); a[:len(b)] += b; return a
def confetti_pop():
    n = int(0.5 * SR); t = np.arange(n) / SR
    return 0.9 * hp(noise(0.5), 800) * np.exp(-t / 0.05) + 0.6 * boom()[:n] * 0.5
def sparkle(sec):
    out = np.zeros(int(sec * SR))
    for k in range(int(sec * 14)):
        f = rng.uniform(2500, 6000); st = int(rng.uniform(0, sec - 0.2) * SR); c = chime(f, 0.25) * 0.12
        out[st:st + len(c)] += c[:len(out) - st]
    return out

# --- ambience: café room tone (loops seamlessly), dreamy pad in the fantasy, crickets at night ---
K = int(0.5 * SR); NN = N + K                                   # extra tail, crossfaded into the start -> seamless loop
room = lp(np.cumsum(rng.standard_normal(NN)) * 0.002, 900); room = hp(room, 60); room /= np.abs(room).max()
murmur = bp(rng.standard_normal(NN), 250, 900); murmur /= np.abs(murmur).max()
t = np.arange(NN) / SR
amb = 0.03 * room + 0.012 * murmur * (0.7 + 0.3 * np.sin(2 * np.pi * t / 7.3))
def win(a, b, f=0.3): return np.clip((t - a) / f, 0, 1) * np.clip((b - t) / f, 0, 1)
fant = np.clip(win(7.2, 9.85) + win(27.3, 38.9), 0, 1)
pad = sum(np.sin(2 * np.pi * f * t) for f in [220, 277.2, 329.6, 415.3]) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 3.1))
pad = lp(pad, 2000) * 0.012
night = np.clip((t - 57.4) / 1.0, 0, 1) * np.clip((60.6 - t) / 1.0, 0, 1)
crick = (np.sin(2 * np.pi * 4200 * t) * (np.sin(2 * np.pi * 28 * t) > 0.6) * (np.sin(2 * np.pi * 0.9 * t) > 0)) * 0.006
full = amb * (1 - 0.8 * fant) + pad * fant + crick * night
fade = np.linspace(0, 1, K)
bed = full[:N].copy(); bed[:K] = full[:K] * fade + full[N:N + K] * (1 - fade)
for x in (L, R): x += bed

# --- camera moves and transitions ---
for tt, sec, up, g in [(2.0, 2.2, False, .35), (6.45, 0.8, True, .5), (26.4, 0.85, True, .5), (40.95, 1.3, True, .3), (61.3, 3.5, True, .3), (56.9, 4.2, True, .12)]:
    put(whoosh(sec, up), tt, g)
for tt in [5.0, 13.5, 16.7, 20.25, 32.1, 35.15, 48.9, 55.6]: put(swish(), tt - 0.05, .35)
put(shimmer(0.9, True), 6.85, .45); put(shimmer(0.9, True), 26.95, .45)
# fantasy exits: pull back (falling whoosh) -> white (falling shimmer) -> out of Max's head (soft falling whoosh)
for a, b, back in [(9.2, 9.85, 1.4), (38.2, 38.9, 1.7)]:
    put(whoosh(b - a, False), a, .45); put(shimmer(0.7, False), b - 0.3, .35); put(whoosh(back, False, 0.7), b, .25)
# --- hands and pieces (pick-up tick at 30 %, wood click at 70 % of each move) ---
moves = [(11.6, 12.75), (17.55, 18.55), (18.85, 19.9), (42.35, 43.35), (44.3, 45.3), (46.85, 47.75), (59.0, 59.55), (59.0, 59.55), (59.1, 59.65), (59.1, 59.65), (59.6, 60.15), (59.6, 60.15)]
for i, (a, b) in enumerate(moves):
    d = b - a; pan = 0.25 if i % 2 else -0.25
    put(pick_tick(), a + 0.3 * d, .5, pan); put(wood_click(1.0 + 0.04 * (i % 3)), a + 0.7 * d - 0.01, .8, pan)
put(pick_tick(), 46.55, .5); put(wood_click(0.95), 46.84, .7)   # bishop lifted and put back
put(pick_tick(), 7.95, .35)                                       # fantasy queen
put(shimmer(0.6, True), 8.0, .25)
# --- stopwatch ---
put(pop(), 20.58, .5)
tk = 20.7
while tk < 26.34: put(tick(), tk, .35); tk += 0.125
put(ding(), 26.36, .5)
# --- fantasy B: ghost moves, the 5, future, the secret eye ---
for k, f in enumerate([523, 659, 784, 988]): put(chime(f, 0.8), 29.6 + 0.4 * k, .35)
put(boom(), 31.28, .5); put(pop(), 31.3, .4)
for tt in [33.05, 33.6, 34.15]: put(whoosh(0.85, True, 2.2), tt, .25)
put(sparkle(1.0), 34.4, .6)
put(chime(1319, 1.6), 35.4, .35); put(chime(1976, 1.4), 35.45, .25)
# --- hours pass: cups, fast clock; finale ---
for i in range(7): put(clink(), 56.0 + i * (61.2 - 56.0) / 7, .45, -0.3 + 0.1 * i)
tk = 58.0
while tk < 61.1: put(tick(), tk, .22); tk += 0.0625
put(confetti_pop(), 61.58, .6); put(sparkle(2.5), 61.65, .7); put(pop(), 61.6, .4)

mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.2) / np.tanh(1.2)            # soft limiter
peak = np.abs(mix).max(); mix *= 0.7 / peak         # peak about -3 dBFS, sits under the narration
wf.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
print("wrote", sys.argv[1], f"{DUR:.2f} s, peak scaled from {peak:.2f}")
