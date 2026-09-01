import { describe, expect, it } from "vitest";
import { computeEAR, EAR_THRESHOLD_PAPER, EAR_THRESHOLD_PYIMAGESEARCH, type Point2D } from "@/lib/vision/ear";
import fixture from "./real-landmarks.json";

/**
 * The credibility centerpiece (see the project plan): EAR's "alert
 * threshold" is genuinely disputed in the literature (0.2 in the
 * original Soukupová & Čech paper vs. 0.3 in the widely-forked
 * PyImageSearch tutorials), so hitting one blessed number proves
 * nothing. What actually matters is that computeEAR() reliably
 * discriminates real closed eyes from real open eyes - the same shape
 * of proof as this portfolio's Loupe judge-calibration test.
 *
 * The landmarks below are not synthetic: they were extracted once,
 * offline, by running the real MediaPipe FaceLandmarker model against
 * six real, openly-licensed photos (see real-landmarks.json's
 * `_provenance` field for exact sources) via
 * scripts/extract-fixture-landmarks.html. Only the resulting numeric
 * landmark coordinates are committed here, not the source photos.
 */

interface SparseLandmark {
  x: number;
  y: number;
}

function toLandmarkArray(sparse: Record<string, SparseLandmark>): Point2D[] {
  const maxIndex = Math.max(...Object.keys(sparse).map(Number));
  const arr: Point2D[] = new Array(maxIndex + 1).fill(null).map(() => ({ x: 0, y: 0 }));
  for (const [idx, point] of Object.entries(sparse)) {
    arr[Number(idx)] = point;
  }
  return arr;
}

const openEARs = fixture.open.map((sample) => computeEAR(toLandmarkArray(sample.landmarks)));
const closedEARs = fixture.closed.map((sample) => computeEAR(toLandmarkArray(sample.landmarks)));

describe("EAR discrimination on real photographed faces", () => {
  it("gives every real open-eye photo a higher EAR than every real closed-eye photo", () => {
    const minOpen = Math.min(...openEARs);
    const maxClosed = Math.max(...closedEARs);
    expect(minOpen).toBeGreaterThan(maxClosed);
  });

  it("has a real, non-trivial separation margin between the two classes' means", () => {
    const meanOpen = openEARs.reduce((a, b) => a + b, 0) / openEARs.length;
    const meanClosed = closedEARs.reduce((a, b) => a + b, 0) / closedEARs.length;
    // Not asserting a specific literature threshold (see file docblock) -
    // just that the gap between classes is real and substantial, not a
    // rounding-error-sized difference that would be noise-sensitive.
    expect(meanOpen - meanClosed).toBeGreaterThan(0.05);
  });

  it("reports where the real measured values sit relative to both cited literature thresholds (informational, not a pass/fail gate)", () => {
    const minOpen = Math.min(...openEARs);
    const maxClosed = Math.max(...closedEARs);
    // eslint-disable-next-line no-console
    console.log(
      `Real photo EARs — open: [${openEARs.map((v) => v.toFixed(3)).join(", ")}], ` +
        `closed: [${closedEARs.map((v) => v.toFixed(3)).join(", ")}]. ` +
        `Cited thresholds: paper=${EAR_THRESHOLD_PAPER}, pyimagesearch=${EAR_THRESHOLD_PYIMAGESEARCH}.`
    );
    // Both closed-eye photos and at least the lowest open-eye photo can
    // legitimately land on either side of a single fixed threshold
    // (real faces vary) - which is exactly why the app treats these as
    // cited reference points, not hardcoded pass/fail gates. This test
    // only asserts the values are finite, sane numbers in [0, ~1] so a
    // formula regression (e.g. producing NaN or a wildly out-of-range
    // value) still fails loudly.
    for (const value of [...openEARs, ...closedEARs]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(minOpen).toBeGreaterThan(maxClosed);
  });
});
