import { describe, expect, it } from "vitest";
import { decomposeRotation, isHeadTurnedAway, YAW_DISTRACTION_THRESHOLD_DEG, PITCH_DISTRACTION_THRESHOLD_DEG } from "@/lib/vision/headPose";

/**
 * Builds a column-major 4x4 matrix (matching MediaPipe's MatrixData
 * default layout - see headPose.ts) from a 3x3 row-major rotation
 * matrix `r` (r[row][col]) plus a zero translation.
 */
function columnMajorMatrix(r: number[][]): { rows: number; columns: number; data: number[] } {
  const data: number[] = [];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      if (col === 3 && row === 3) data.push(1);
      else if (col === 3 || row === 3) data.push(0);
      else data.push(r[row][col]);
    }
  }
  return { rows: 4, columns: 4, data };
}

function rotationY(deg: number): number[][] {
  const t = (deg * Math.PI) / 180;
  return [
    [Math.cos(t), 0, Math.sin(t)],
    [0, 1, 0],
    [-Math.sin(t), 0, Math.cos(t)],
  ];
}

function rotationX(deg: number): number[][] {
  const t = (deg * Math.PI) / 180;
  return [
    [1, 0, 0],
    [0, Math.cos(t), -Math.sin(t)],
    [0, Math.sin(t), Math.cos(t)],
  ];
}

describe("decomposeRotation", () => {
  it("decomposes the identity matrix to zero yaw/pitch/roll", () => {
    const identity = columnMajorMatrix([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    const angles = decomposeRotation(identity);
    expect(angles.yawDeg).toBeCloseTo(0, 6);
    expect(angles.pitchDeg).toBeCloseTo(0, 6);
    expect(angles.rollDeg).toBeCloseTo(0, 6);
  });

  it("recovers a known 30-degree yaw (Y-axis rotation) with near-zero pitch/roll", () => {
    const angles = decomposeRotation(columnMajorMatrix(rotationY(30)));
    expect(angles.yawDeg).toBeCloseTo(30, 6);
    expect(angles.pitchDeg).toBeCloseTo(0, 6);
    expect(angles.rollDeg).toBeCloseTo(0, 6);
  });

  it("recovers a known -45-degree yaw", () => {
    const angles = decomposeRotation(columnMajorMatrix(rotationY(-45)));
    expect(angles.yawDeg).toBeCloseTo(-45, 6);
  });

  it("recovers a known 20-degree pitch (X-axis rotation) with near-zero yaw/roll", () => {
    const angles = decomposeRotation(columnMajorMatrix(rotationX(20)));
    expect(angles.pitchDeg).toBeCloseTo(20, 6);
    expect(angles.yawDeg).toBeCloseTo(0, 6);
    expect(angles.rollDeg).toBeCloseTo(0, 6);
  });
});

describe("isHeadTurnedAway", () => {
  it("is false when looking straight ahead", () => {
    expect(isHeadTurnedAway({ yawDeg: 0, pitchDeg: 0, rollDeg: 0 })).toBe(false);
  });

  it("is true just past the yaw threshold", () => {
    expect(isHeadTurnedAway({ yawDeg: YAW_DISTRACTION_THRESHOLD_DEG + 1, pitchDeg: 0, rollDeg: 0 })).toBe(true);
  });

  it("is false just under the yaw threshold", () => {
    expect(isHeadTurnedAway({ yawDeg: YAW_DISTRACTION_THRESHOLD_DEG - 1, pitchDeg: 0, rollDeg: 0 })).toBe(false);
  });

  it("is true just past the pitch threshold in either direction", () => {
    expect(isHeadTurnedAway({ yawDeg: 0, pitchDeg: PITCH_DISTRACTION_THRESHOLD_DEG + 1, rollDeg: 0 })).toBe(true);
    expect(isHeadTurnedAway({ yawDeg: 0, pitchDeg: -(PITCH_DISTRACTION_THRESHOLD_DEG + 1), rollDeg: 0 })).toBe(true);
  });
});
