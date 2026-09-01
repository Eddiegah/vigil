<div align="center">

# Vigil

[![CI](https://github.com/Eddiegah/vigil/actions/workflows/ci.yml/badge.svg)](https://github.com/Eddiegah/vigil/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live demo](https://img.shields.io/badge/demo-live-3ecf8e?logo=vercel&logoColor=white)](https://vigil-jade.vercel.app)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)

</div>

**[Live demo](https://vigil-jade.vercel.app)**

A real-time driver drowsiness and attention monitor that runs entirely in your browser. It
tracks your face through a webcam feed, computes eye-closure and head-pose signals every frame,
and raises a visible-plus-audible alert when you've been drowsy or looking away for too long —
no video is ever recorded, uploaded, or stored, and no server is involved once the page has
loaded: face tracking runs client-side via MediaPipe's WASM Face Landmarker.

Vigil is the sibling of this portfolio's [SignBridge](https://github.com/Eddiegah/signbridge)
project — real-time, honestly-scoped, privacy-conscious computer vision built from real
landmark data, not a black-box wrapper. SignBridge is deliberately local-only; Vigil takes the
same privacy stance ("nothing about your face ever leaves your device") but ships it as a live,
hostable web app, since inference here runs entirely in WASM in the visitor's own browser.

## Why this is real, not a demo

- **A real discrimination test, not a threshold hit.** Eye Aspect Ratio's "closed-eye" alert
  threshold is genuinely disputed in the literature — the original
  [Soukupová & Čech (2016)](https://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf) paper
  uses 0.2 as its baseline; the far more widely-implemented
  [PyImageSearch](https://pyimagesearch.com/2017/05/08/drowsiness-detection-opencv/) tutorials use
  0.3. Rather than pick one and pretend it's settled science, Vigil's test suite proves the
  underlying signal actually *discriminates*: real MediaPipe landmarks, extracted once offline
  from six real, openly-licensed photos (three with eyes clearly open, three clearly closed),
  are fed through the exact `computeEAR()` the app uses, and every open-eye photo scores higher
  than every closed-eye photo — a real measured margin on real photographed faces, not a
  synthetic number. See `tests/fixtures/ear-discrimination.test.ts`.
- **PERCLOS, honestly sourced.** The rolling percentage-of-eye-closure metric traces back to
  Wierwille et al. 1994 (NHTSA/FHWA report DOT HS 808 247); its own alert-threshold literature
  spans 10–40% depending on the study. Vigil cites the most specific number found
  ([Lin et al. 2012](https://doi.org/10.1167/12.9.546), ~10–15%) as a default rather than
  inventing one, and the rolling-window tracker itself is unit-tested against synthetic
  timeseries with known ground-truth closure percentages, including window-boundary edge cases.
- **Real head pose, not an approximated one.** Instead of the traditional `solvePnP` +
  hand-picked 6-point generic face model (itself only an approximation), Vigil decomposes the
  actual facial transformation matrix MediaPipe's Face Landmarker computes per frame — verified
  against MediaPipe's own `matrix_data.proto`, which documents the matrix as column-major, and
  tested against hand-constructed rotation matrices with known yaw/pitch angles.
- **Debounced against false alarms on purpose.** A single blink or a glance at a mirror must
  never trip an alert — `AlertStateMachine` only fires once a signal has held continuously past
  a configured duration, tested explicitly against both the "one normal blink" and "sustained
  closure" cases.

## Architecture

```
src/
  lib/
    vision/
      landmarkIndices.ts   MediaPipe eye-contour landmark indices, verified against
                            MediaPipe's own FACEMESH_RIGHT_EYE/FACEMESH_LEFT_EYE constants
      ear.ts                computeEAR() - Soukupová & Čech 2016 formula
      perclos.ts              PerclosTracker - rolling time-windowed closure percentage
      headPose.ts               decomposes MediaPipe's facial transformation matrix to
                                 yaw/pitch/roll
    alerts/
      alertState.ts         AlertStateMachine - debounced ok/distracted/drowsy state
  components/
    WebcamView.tsx           owns getUserMedia + FaceLandmarker + the detection loop
    OverlayCanvas.tsx           draws live eye-contour landmarks over the video
    AlertBanner.tsx               visual + synthesized-tone alert banner
  app/page.tsx                 composes the above, live readout, threshold settings

tests/
  unit/            EAR/PERCLOS/head-pose/alert-state pure-function tests
  fixtures/          the real-photo EAR discrimination test (the centerpiece above)

scripts/
  extract-fixture-landmarks.html   the one-time offline tool used to generate
                                    tests/fixtures/real-landmarks.json from real photos
                                    (open with a static file server, not part of the app)
```

Fully client-side: no backend, no database, no auth, $0 to run. MediaPipe's Face Landmarker Task
(`@mediapipe/tasks-vision`) runs entirely in-browser via WASM against your webcam feed — once
the page and its ~12MB WASM model have loaded, nothing about your face is ever sent anywhere.

## Local development

```bash
npm install
npm run dev    # http://localhost:3000, needs a webcam
npm test
```

## Deliberately out of scope for v1

- Per-user EAR calibration (a short "look normal for 5 seconds" baseline step) — the threshold
  slider is a manual stand-in for now.
- Multi-face support — tracks one face at a time.
- Any event logging or history — by design, nothing is ever stored; the app is live-readout only.
- Mobile/touch-optimized layout.
- Audio customization beyond a single synthesized alert tone per alert level.

## License

MIT © [Edmund Eric Gah](https://github.com/Eddiegah) — see [LICENSE](LICENSE).
