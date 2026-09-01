import { describe, expect, it } from "vitest";
import { PerclosTracker } from "@/lib/vision/perclos";

describe("PerclosTracker", () => {
  it("returns 0 with fewer than 2 samples", () => {
    const tracker = new PerclosTracker(2000);
    expect(tracker.perclos()).toBe(0);
    tracker.update(0, true);
    expect(tracker.perclos()).toBe(0);
  });

  it("computes exactly 50% for a half-closed, half-open window", () => {
    const tracker = new PerclosTracker(2000);
    tracker.update(0, true); // closed for [0, 1000)
    tracker.update(1000, false); // open for [1000, 2000)
    tracker.update(2000, false); // closes out the open segment
    expect(tracker.perclos()).toBeCloseTo(0.5, 10);
  });

  it("only reflects the rolling window, evicting data older than windowMs", () => {
    const tracker = new PerclosTracker(1000);
    tracker.update(0, true); // closed for [0, 1000)
    tracker.update(1000, false); // open starting at 1000
    tracker.update(3000, false); // now [2000, 3000) is the live window - all open
    expect(tracker.perclos()).toBe(0);
  });

  it("reports over whatever history is available before the window fills, not padded", () => {
    const tracker = new PerclosTracker(10_000);
    tracker.update(0, true);
    tracker.update(500, true);
    tracker.update(1000, false);
    // Only 1000ms of history exists yet (window is 10s), and every bit of
    // it was closed up to the last transition - perclos should be 1.0,
    // not diluted by the unfilled remainder of the configured window.
    expect(tracker.perclos()).toBeCloseTo(1.0, 10);
  });

  it("reset() clears all history", () => {
    const tracker = new PerclosTracker(2000);
    tracker.update(0, true);
    tracker.update(1000, false);
    tracker.reset();
    expect(tracker.perclos()).toBe(0);
  });
});
