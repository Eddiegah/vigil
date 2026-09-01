import { LEFT_EYE, RIGHT_EYE } from "./landmarkIndices";

export interface Point2D {
  x: number;
  y: number;
}

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Eye Aspect Ratio - Soukupová & Čech, "Real-Time Eye Blink Detection
 * using Facial Landmarks," CVWW 2016: EAR = (|p2-p6| + |p3-p5|) / (2|p1-p4|).
 * p1/p4 are the horizontal eye-corner landmarks, p2/p3 the upper lid,
 * p5/p6 the lower lid - EAR falls toward 0 as the eyelid closes and
 * stays roughly constant while the eye is open, independent of the
 * face's distance from the camera (it's a ratio, not an absolute size).
 */
export function eyeAspectRatio(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D, p5: Point2D, p6: Point2D): number {
  return (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4));
}

/**
 * EAR for one eye, indexing a MediaPipe FaceLandmarker landmark array
 * with the 6-point subset from ./landmarkIndices.
 */
export function eyeAspectRatioFromLandmarks(landmarks: readonly Point2D[], eyeIndices: readonly [number, number, number, number, number, number]): number {
  const [i1, i2, i3, i4, i5, i6] = eyeIndices;
  return eyeAspectRatio(landmarks[i1], landmarks[i2], landmarks[i3], landmarks[i4], landmarks[i5], landmarks[i6]);
}

/**
 * Average EAR across both eyes for one frame's 478-point landmark array
 * (blinking is synchronous, so the paper averages both eyes rather than
 * tracking them independently).
 */
export function computeEAR(landmarks: readonly Point2D[]): number {
  const right = eyeAspectRatioFromLandmarks(landmarks, RIGHT_EYE);
  const left = eyeAspectRatioFromLandmarks(landmarks, LEFT_EYE);
  return (right + left) / 2;
}

/**
 * Two real, disputed thresholds from the literature - the original
 * paper's own baseline op-point is 0.2 (Fig. 2/7 of the CVWW 2016
 * paper); the far more commonly *implemented* value, from Adrian
 * Rosebrock/PyImageSearch's widely-forked drowsiness-detection
 * tutorials, is 0.3. Neither is "the" scientific answer - both are
 * shipped here as cited reference points, and the app's live default
 * (see alertState.ts) is their midpoint, explicitly labeled as a chosen
 * default rather than a proven constant.
 */
export const EAR_THRESHOLD_PAPER = 0.2;
export const EAR_THRESHOLD_PYIMAGESEARCH = 0.3;
export const EAR_THRESHOLD_DEFAULT = 0.25;
