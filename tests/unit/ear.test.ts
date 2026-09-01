import { describe, expect, it } from "vitest";
import { computeEAR, eyeAspectRatio, eyeAspectRatioFromLandmarks, type Point2D } from "@/lib/vision/ear";
import { LEFT_EYE, RIGHT_EYE } from "@/lib/vision/landmarkIndices";

describe("eyeAspectRatio", () => {
  it("computes the exact ratio for a hand-constructed open-eye shape", () => {
    // Horizontal span 4 (p1-p4), two vertical chords of length 2 each.
    // EAR = (2 + 2) / (2 * 4) = 0.5
    const p1: Point2D = { x: 0, y: 0 };
    const p2: Point2D = { x: 1, y: -1 };
    const p3: Point2D = { x: 3, y: -1 };
    const p4: Point2D = { x: 4, y: 0 };
    const p5: Point2D = { x: 3, y: 1 };
    const p6: Point2D = { x: 1, y: 1 };

    expect(eyeAspectRatio(p1, p2, p3, p4, p5, p6)).toBeCloseTo(0.5, 10);
  });

  it("computes a small ratio for a hand-constructed nearly-closed-eye shape", () => {
    // Same horizontal span, vertical chords shrunk to 0.1 each.
    // EAR = (0.1 + 0.1) / (2 * 4) = 0.025
    const p1: Point2D = { x: 0, y: 0 };
    const p2: Point2D = { x: 1, y: -0.05 };
    const p3: Point2D = { x: 3, y: -0.05 };
    const p4: Point2D = { x: 4, y: 0 };
    const p5: Point2D = { x: 3, y: 0.05 };
    const p6: Point2D = { x: 1, y: 0.05 };

    expect(eyeAspectRatio(p1, p2, p3, p4, p5, p6)).toBeCloseTo(0.025, 10);
  });

  it("is 0 when the eyelids fully touch (zero vertical distance)", () => {
    const p1: Point2D = { x: 0, y: 0 };
    const p2: Point2D = { x: 1, y: 0 };
    const p3: Point2D = { x: 3, y: 0 };
    const p4: Point2D = { x: 4, y: 0 };
    const p5: Point2D = { x: 3, y: 0 };
    const p6: Point2D = { x: 1, y: 0 };

    expect(eyeAspectRatio(p1, p2, p3, p4, p5, p6)).toBe(0);
  });
});

describe("eyeAspectRatioFromLandmarks / computeEAR", () => {
  it("indexes the right landmark positions out of a full 478-point array", () => {
    const landmarks: Point2D[] = new Array(478).fill(null).map(() => ({ x: 0, y: 0 }));
    const [i1, i2, i3, i4, i5, i6] = RIGHT_EYE;
    landmarks[i1] = { x: 0, y: 0 };
    landmarks[i2] = { x: 1, y: -1 };
    landmarks[i3] = { x: 3, y: -1 };
    landmarks[i4] = { x: 4, y: 0 };
    landmarks[i5] = { x: 3, y: 1 };
    landmarks[i6] = { x: 1, y: 1 };

    expect(eyeAspectRatioFromLandmarks(landmarks, RIGHT_EYE)).toBeCloseTo(0.5, 10);
  });

  it("averages both eyes", () => {
    const landmarks: Point2D[] = new Array(478).fill(null).map(() => ({ x: 0, y: 0 }));

    // Right eye: EAR = 0.5 (open)
    const [r1, r2, r3, r4, r5, r6] = RIGHT_EYE;
    landmarks[r1] = { x: 0, y: 0 };
    landmarks[r2] = { x: 1, y: -1 };
    landmarks[r3] = { x: 3, y: -1 };
    landmarks[r4] = { x: 4, y: 0 };
    landmarks[r5] = { x: 3, y: 1 };
    landmarks[r6] = { x: 1, y: 1 };

    // Left eye: EAR = 0.025 (nearly closed)
    const [l1, l2, l3, l4, l5, l6] = LEFT_EYE;
    landmarks[l1] = { x: 0, y: 0 };
    landmarks[l2] = { x: 1, y: -0.05 };
    landmarks[l3] = { x: 3, y: -0.05 };
    landmarks[l4] = { x: 4, y: 0 };
    landmarks[l5] = { x: 3, y: 0.05 };
    landmarks[l6] = { x: 1, y: 0.05 };

    expect(computeEAR(landmarks)).toBeCloseTo((0.5 + 0.025) / 2, 10);
  });
});
