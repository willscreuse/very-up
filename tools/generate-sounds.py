#!/usr/bin/env python3
"""Génère les effets sonores de Very Up (synthèse pure, sans dépendance).

Usage : python3 tools/generate-sounds.py
Les fichiers sont écrits dans assets/sounds/. Modifie les paramètres ci-dessous
puis relance le script pour ajuster un son.
"""
import math
import os
import random
import struct
import wave

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
random.seed(7)  # sons reproductibles


# ---------- briques de base ----------------------------------------------------

def n_samples(d):
    return int(SR * d)


def silence(d):
    return [0.0] * n_samples(d)


def mix(*tracks):
    n = max(len(t) for t in tracks)
    return [sum(t[i] for t in tracks if i < len(t)) for i in range(n)]


def at(track, delay):
    return silence(delay) + track


def gain(track, g):
    return [x * g for x in track]


def adsr(n, a=0.005, d=0.05, s=0.7, r=0.08):
    a_n, d_n, r_n = n_samples(a), n_samples(d), n_samples(r)
    env = []
    for i in range(n):
        if i < a_n:
            e = i / max(1, a_n)
        elif i < a_n + d_n:
            e = 1 - (1 - s) * (i - a_n) / max(1, d_n)
        else:
            e = s
        if i > n - r_n:
            e *= max(0.0, (n - i) / max(1, r_n))
        env.append(e)
    return env


def osc(freq_fn, dur, harmonics=((1, 1.0),), vibrato=(0, 0)):
    """Oscillateur additif ; freq_fn(t) donne la fréquence à l'instant t."""
    n = n_samples(dur)
    vib_rate, vib_depth = vibrato
    out, phase = [], 0.0
    for i in range(n):
        t = i / SR
        f = freq_fn(t) * (1 + vib_depth * math.sin(2 * math.pi * vib_rate * t))
        phase += 2 * math.pi * f / SR
        out.append(sum(a * math.sin(k * phase) for k, a in harmonics))
    return out


def apply_env(track, env):
    return [x * e for x, e in zip(track, env)]


def lowpass(track, cutoff_fn):
    out, y = [], 0.0
    for i, x in enumerate(track):
        c = cutoff_fn(i / SR)
        alpha = 1 - math.exp(-2 * math.pi * c / SR)
        y += alpha * (x - y)
        out.append(y)
    return out


def noise(dur):
    return [random.uniform(-1, 1) for _ in range(n_samples(dur))]


def exp_decay(n, tau):
    return [math.exp(-(i / SR) / tau) for i in range(n)]


BRASS = tuple((k, 1 / k) for k in range(1, 9))  # dent de scie douce
BELL = ((1, 1.0), (2.76, 0.5), (5.4, 0.25), (8.9, 0.12))  # partiels inharmoniques


def note(freq, dur, harmonics=BRASS, a=0.01, d=0.08, s=0.75, r=0.06, vibrato=(5.5, 0.006), bright=4000):
    tone = osc(lambda t: freq, dur, harmonics, vibrato)
    tone = lowpass(tone, lambda t: bright)
    return apply_env(tone, adsr(len(tone), a, d, s, r))


def bell(freq, dur=0.5, tau=0.18):
    tone = osc(lambda t: freq, dur, BELL)
    return apply_env(tone, exp_decay(len(tone), tau))


def drum(freq=140, dur=0.25):
    body = osc(lambda t: freq * (1 + 1.5 * math.exp(-t * 30)), dur)
    body = apply_env(body, exp_decay(len(body), 0.07))
    snap = apply_env(lowpass(noise(dur), lambda t: 3000), exp_decay(n_samples(dur), 0.02))
    return mix(body, gain(snap, 0.5))


def save(name, track, peak=0.9):
    m = max(abs(x) for x in track) or 1
    data = b''.join(struct.pack('<h', int(x / m * peak * 32767)) for x in track)
    with wave.open(os.path.join(OUT, f'{name}.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)
    print(f'  {name}.wav  {len(track) / SR:.2f} s')


# ---------- les sons ------------------------------------------------------------

def found():
    """« Ding-ding ! » cristallin + paillettes."""
    sparkle = mix(*[
        at(gain(bell(random.uniform(2500, 4200), 0.12, 0.03), 0.25), 0.12 + i * 0.035)
        for i in range(6)
    ])
    return mix(bell(987.8, 0.3, 0.1), at(bell(1318.5, 0.5, 0.2), 0.09), sparkle)


def skip():
    """Sifflet à coulisse qui descend : « bwiiou ». """
    dur = 0.32
    tone = osc(lambda t: 950 * math.exp(-t * 4.2) + 180, dur, ((1, 1), (2, 0.15)), (11, 0.03))
    return apply_env(tone, adsr(len(tone), 0.005, 0.05, 0.8, 0.1))


def woodblock(freq):
    n = n_samples(0.09)
    body = apply_env(osc(lambda t: freq, 0.09, ((1, 1), (2.3, 0.3))), exp_decay(n, 0.018))
    click = apply_env(noise(0.09), exp_decay(n, 0.002))
    return mix(body, gain(click, 0.4))


def time_up():
    """Trombone triste « wah wah wah waaah »."""
    notes = [(311.1, 0.28), (293.7, 0.28), (277.2, 0.28), (261.6, 0.9)]
    out, t0 = [], 0.0
    for i, (f, d) in enumerate(notes):
        last = i == len(notes) - 1
        tone = osc(lambda t: f, d, BRASS, (5 if last else 0, 0.02 if last else 0))
        # effet « wah » : filtre qui s'ouvre puis se referme
        tone = lowpass(tone, lambda t, d=d: 300 + 2200 * math.sin(math.pi * min(1, t / d)) ** 2)
        tone = apply_env(tone, adsr(len(tone), 0.02, 0.05, 0.9, 0.08 if not last else 0.4))
        out = mix(out, at(tone, t0)) if out else at(tone, t0)
        t0 += d
    return out


def start():
    """Petit « ta-da-da-DAAA » de cuivres + coup de tambour."""
    seq = [(523.3, 0.0, 0.1), (659.3, 0.11, 0.1), (784.0, 0.22, 0.1), (1046.5, 0.33, 0.45)]
    brass = mix(*[at(note(f, d, r=0.05 if d < 0.2 else 0.25), t) for f, t, d in seq])
    return mix(brass, at(gain(drum(120, 0.3), 0.8), 0.33))


def round_end():
    """Roulement de tambour qui accélère, puis accord final."""
    hits, t, gap = [], 0.0, 0.09
    while t < 0.8:
        hits.append(at(gain(drum(220, 0.08), 0.35 + 0.5 * t), t))
        t += gap
        gap = max(0.025, gap * 0.85)
    chord = mix(*[note(f, 0.7, r=0.4) for f in (523.3, 659.3, 784.0)])
    return mix(*hits, at(chord, 0.82), at(drum(100, 0.4), 0.82))


def victory():
    """Fanfare de victoire, accord tenu avec vibrato."""
    seq = [
        (392.0, 0.0, 0.12), (523.3, 0.13, 0.12), (659.3, 0.26, 0.12), (784.0, 0.39, 0.25),
        (659.3, 0.66, 0.12), (784.0, 0.79, 0.12),
    ]
    melody = mix(*[at(note(f, d, r=0.05), t) for f, t, d in seq])
    final = mix(*[note(f, 1.1, vibrato=(6, 0.01), r=0.6) for f in (523.3, 659.3, 784.0, 1046.5)])
    sparkle = mix(*[
        at(gain(bell(random.uniform(2000, 4000), 0.2, 0.05), 0.2), 0.95 + i * 0.07) for i in range(10)
    ])
    return mix(melody, at(final, 0.93), at(drum(110, 0.4), 0.93), sparkle)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    print('Génération des sons :')
    save('found', found())
    save('skip', skip())
    save('tick', woodblock(1250))
    save('tock', woodblock(880))
    save('timeup', time_up())
    save('start', start())
    save('roundend', round_end())
    save('victory', victory())
