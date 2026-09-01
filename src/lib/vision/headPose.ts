export interface EulerAngles {
  /** Rotation about the vertical axis - turning the head left/right. Degrees. */
  yawDeg: number;
  /** Rotation about the horizontal axis - nodding up/down. Degrees. */
  pitchDeg: number;
  /** Rotation about the depth axis - tilting the head side to side. Degrees. */
  rollDeg: number;
}

/**
 * MediaPipe's facial transformation matrix (`facialTransformationMatrixes[i]`)
 * wraps a MatrixData proto whose `packed_data` is column-major by
 * default (mediapipe/framework/formats/matrix_data.proto: "Data are
 * stored in column-major order by default... Defaults to COLUMN_MAJOR,
 * which matches the default for mediapipe::Matrix and Eigen::Matrix*").
 * For a 4x4 column-major array, element (row, col) lives at
 * `data[col * rows + row]`.
 */
function element(data: readonly number[], rows: number, row: number, col: number): number {
  return data[col * rows + row];
}

/**
 * Decomposes the 3x3 rotation submatrix of a MediaPipe facial
 * transformation matrix into yaw/pitch/roll Euler angles (standard ZYX
 * extraction: pitch = atan2(R21,R22), yaw = atan2(-R20, hypot(R21,R22)),
 * roll = atan2(R10,R00), using 0-indexed row/col). Degenerates at pitch
 * = +/-90 degrees (gimbal lock), where yaw and roll become coupled - not
 * a concern for a driver-attention monitor, where such an extreme pitch
 * means the face is no longer usably detected anyway.
 */
export function decomposeRotation(matrix: { rows: number; columns: number; data: readonly number[] }): EulerAngles {
  const { rows, data } = matrix;
  const r = (row: number, col: number) => element(data, rows, row, col);

  const pitchRad = Math.atan2(r(2, 1), r(2, 2));
  const yawRad = Math.atan2(-r(2, 0), Math.hypot(r(2, 1), r(2, 2)));
  const rollRad = Math.atan2(r(1, 0), r(0, 0));

  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  return { yawDeg: toDeg(yawRad), pitchDeg: toDeg(pitchRad), rollDeg: toDeg(rollRad) };
}

/**
 * Distraction heuristic: the head has turned far enough away from
 * center that the driver is very unlikely to be watching the road.
 * These are UI-adjustable defaults, not a cited literature threshold -
 * head-pose-based distraction detection doesn't have the same
 * body-of-research backing that EAR/PERCLOS does, so this is stated
 * plainly as a reasonable engineering default, not fabricated science.
 */
export const YAW_DISTRACTION_THRESHOLD_DEG = 30;
export const PITCH_DISTRACTION_THRESHOLD_DEG = 25;

export function isHeadTurnedAway(angles: EulerAngles): boolean {
  return Math.abs(angles.yawDeg) > YAW_DISTRACTION_THRESHOLD_DEG || Math.abs(angles.pitchDeg) > PITCH_DISTRACTION_THRESHOLD_DEG;
}
