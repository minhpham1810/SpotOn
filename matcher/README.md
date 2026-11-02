# Sample matcher

A private service the SpotOn app calls to check whether a song really contains a sample Genius lists,
and if so where and how it was changed. Input: two iTunes 30-second preview URLs. Output: found or not,
a score, pitch shift, speed, mode (`unchanged`, `turntable`, `stretched`), and where the match sits in each clip.

## How it works

1. Decode each preview (PyAV) to mono 22.05 kHz and take a constant-Q spectrogram (3 bins per semitone).
2. Pick the strongest local peaks, then form triplets: an anchor plus pairs of the loudest peaks just after it.
   The hash keeps frequency **differences** (unchanged by a pitch shift) and the **ratio** of the two time gaps
   (unchanged by a speed change).
3. Every hash shared by the two clips implies a pitch shift, a speed and an offset. A reused recording makes many
   hits agree on one cell; chance hits scatter.
4. Raw votes depend on the songs (sparse, repetitive drums match everything), so the score is normalized against
   how well each side matches 22 unrelated background songs. Only fingerprints of those are kept, in memory.

Why this design, and what was tried first (chroma and CQT cross-correlation could locate a sample but not
decide whether one exists): [docs/designs/sample-archaeology.md](../docs/designs/sample-archaeology.md).

## Results

[eval/RESULTS.md](eval/RESULTS.md): on held-out real pairs, 4 of 30 confirmed and 0 of 60 unrelated pairs wrongly
confirmed. A miss may be the matcher or a sample outside the 30-second previews; the eval cannot tell which.

## Run

```
docker build --target test .                 # unit tests (synthetic audio with exact ground truth, URL guard, HTTP)
docker build -t spoton-matcher .             # service on :8000 (POST /match, GET /healthz, GET /readyz)
../scripts/smoke-test-matcher.sh spoton-matcher
GENIUS_ACCESS_TOKEN=... python -m eval.run_eval   # real-audio eval, needs network; rewrites eval/RESULTS.md
```

`docker compose up --build` from the repo root runs it next to the app with no published port.

## Limits

- 30-second previews only, so samples outside them are missed. Trying several releases of each song would add
  coverage (the spike saw a different "Under Pressure" release change the result).
- Software pitch-shifted samples score lower than turntable or unchanged ones (synthetic tests: thin margin).
- No auth on `/match`: it must stay on a private network. Add an ID-token check before deploying it to Cloud Run.
- The image is about 1 GB (numba, LLVM, scikit-learn via librosa). Cold start measured locally: healthy in 0.6 s,
  ready in 4.3 s, about 480 MiB resident.
