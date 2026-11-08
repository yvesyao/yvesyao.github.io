"""Render the original score Paperlight / 纸上微光. Requires numpy and ffmpeg.

No recordings, samples or external compositions are used. The circular mix
includes the previous phrase's release and reverb, so the loop has no dead air.
Run: python render-music.py [output.mp3]
"""

from pathlib import Path
import subprocess
import sys
import tempfile
import wave

import numpy as np

RATE = 32000
BEAT = 60 / 80
BAR = 4 * BEAT
SECONDS = 32 * BAR
SIZE = round(RATE * SECONDS)
mix = np.zeros((SIZE, 2), dtype=np.float64)


def voice(midi, duration, kind):
    t = np.arange(round(duration * RATE)) / RATE
    f = 440 * 2 ** ((midi - 69) / 12)
    phase = 2 * np.pi * f * t
    if kind == "keys":
        tone = (np.sin(phase) + .23 * np.sin(2 * phase) * np.exp(-t / .9)
                + .09 * np.sin(3 * phase) * np.exp(-t / .45))
        env = (1 - np.exp(-t / .025)) * np.exp(-t / 1.65)
    elif kind == "pad":
        tone = (.52 * np.sin(phase) + .24 * np.sin(phase * 1.0017)
                + .24 * np.sin(phase * .9983) + .07 * np.sin(2 * phase))
        env = np.minimum(t / 1.4, 1) * np.minimum((duration - t) / 3.2, 1)
        env = np.maximum(env, 0) ** 1.6
    else:
        tone = np.sin(phase) + .12 * np.sin(2 * phase)
        env = (1 - np.exp(-t / .16)) * np.exp(-t / 2.8)
    # Rounded release avoids clicks even in the quieter long reverb tails.
    env *= np.minimum((duration - t) / .22, 1).clip(0, 1)
    return tone * env


def note(start, midi, duration, level, pan=0, kind="keys"):
    signal = voice(midi, duration, kind) * level
    angle = (pan + 1) * np.pi / 4
    stereo = signal[:, None] * np.array([np.cos(angle), np.sin(angle)])
    offset = round(start * RATE) % SIZE
    first = min(len(signal), SIZE - offset)
    mix[offset:offset + first] += stereo[:first]
    if first < len(signal):
        mix[:len(signal) - first] += stereo[first:]


# Close voicings keep common tones while the bass moves slowly. Each harmony
# lasts four bars. The second 16 bars vary the motif instead of adding layers.
chords = [
    (38, [57, 61, 64, 66]),  # Dmaj9
    (43, [55, 59, 62, 66]),  # Gmaj7
    (35, [57, 59, 62, 66]),  # Bm7
    (45, [57, 59, 64, 66]),  # A6sus2
    (38, [57, 61, 64, 66]),
    (43, [55, 59, 62, 66]),
    (40, [55, 59, 62, 66]),  # Em9
    (45, [57, 59, 64, 66]),
]
motifs = [[73, 69, 66], [71, 69, 66], [69, 66, 62], [71, 69, 64],
          [73, 76, 69], [71, 69, 66], [74, 71, 66], [71, 69, 66]]
for section, (bass, chord) in enumerate(chords):
    start = section * 4 * BAR
    for j, pitch in enumerate(chord):
        note(start + j * .035, pitch, 4 * BAR + 3.2, .031,
             (j - 1.5) * .18, "pad")
    for bar in range(4):
        at = start + bar * BAR
        if bar % 2 == 0:
            note(at, bass + 12, 6.4, .075, 0, "bass")
        order = [0, 2, 1, 3] if section < 4 else [1, 3, 0, 2]
        note(at + .04, chord[order[bar]], 5, .135, -.19)
        note(at + 2 * BEAT + .025, chord[order[(bar + 1) % 4]],
             5, .101, .17)
        if bar in (0, 2):
            note(at + 3 * BEAT, chord[3] + 12, 4.5, .038, .25)
    for j, pitch in enumerate(motifs[section]):
        note(start + (3 + j * 4.5) * BEAT, pitch, 6.5,
             [.071, .057, .047][j], .08)

dry = mix.copy()
for delay, gain in [(0.109, .18), (.173, .15), (.271, .11), (.419, .085),
                    (.617, .065), (.953, .045), (1.47, .026), (2.19, .014)]:
    mix += np.roll(dry[:, ::-1], round(delay * RATE), axis=0) * gain
mix -= mix.mean(axis=0)
rms = np.sqrt(np.mean(mix ** 2))
mix *= min(10 ** (-20 / 20) / rms, .72 / np.max(np.abs(mix)))
output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("paperlight.mp3")
with tempfile.TemporaryDirectory() as temp:
    wav = Path(temp) / "paperlight.wav"
    with wave.open(str(wav), "wb") as file:
        file.setnchannels(2)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes((mix * 32767).astype("<i2").tobytes())
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                    "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "96k",
                    "-metadata", "title=Paperlight / 纸上微光",
                    "-metadata", "artist=Focus Atelier", str(output)], check=True)
print(f"{output.name}: {SECONDS:.0f}s, {RATE} Hz stereo, {output.stat().st_size} bytes")
print(f"RMS {20*np.log10(np.sqrt(np.mean(mix**2))):.2f} dBFS; "
      f"peak {20*np.log10(np.max(np.abs(mix))):.2f} dBFS; "
      f"loop step {np.max(np.abs(mix[0]-mix[-1])):.6f}")
