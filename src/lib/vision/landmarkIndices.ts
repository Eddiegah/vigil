/**
 * MediaPipe Face Landmarker outputs 478 3D face landmarks per detected
 * face. The 6-point-per-eye subset below follows the canonical EAR
 * layout from Soukupová & Čech 2016 (p1/p4 = horizontal corners, p2/p3 =
 * upper lid, p5/p6 = lower lid) mapped onto MediaPipe's index space.
 *
 * Verified against MediaPipe's own exported FACEMESH_RIGHT_EYE /
 * FACEMESH_LEFT_EYE contour connections (mediapipe/python/solutions/
 * face_mesh_connections.py) - every index below is a real point on that
 * official 16-point eye contour, not a guess. "Right"/"left" follow
 * MediaPipe's convention, which is the subject's own right/left (mirrored
 * from the viewer's perspective on a front-facing selfie camera).
 */
export const RIGHT_EYE: readonly [number, number, number, number, number, number] = [
  33, 160, 158, 133, 153, 144,
];

export const LEFT_EYE: readonly [number, number, number, number, number, number] = [
  362, 385, 387, 263, 373, 380,
];
