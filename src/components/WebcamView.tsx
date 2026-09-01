"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { computeEAR, EAR_THRESHOLD_DEFAULT } from "@/lib/vision/ear";
import { decomposeRotation, isHeadTurnedAway } from "@/lib/vision/headPose";
import { PerclosTracker, PERCLOS_WINDOW_MS_DEFAULT } from "@/lib/vision/perclos";
import { AlertStateMachine, DEFAULT_ALERT_OPTIONS, type AlertLevel } from "@/lib/alerts/alertState";

// Official MediaPipe-hosted model asset - the standard pattern used by
// MediaPipe's own web demos, no need to vendor a multi-MB model file
// into this repo.
const MODEL_ASSET_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WASM_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

export interface FrameMetrics {
  ear: number;
  perclos: number;
  yawDeg: number;
  pitchDeg: number;
  alertLevel: AlertLevel;
  faceDetected: boolean;
}

export type SetupStatus = "loading" | "ready" | "camera-denied" | "error";

interface WebcamViewProps {
  earThreshold?: number;
  onMetrics: (metrics: FrameMetrics) => void;
  onLandmarks: (landmarks: NormalizedLandmark[] | null, videoEl: HTMLVideoElement | null) => void;
  onStatusChange: (status: SetupStatus) => void;
}

export function WebcamView({ earThreshold = EAR_THRESHOLD_DEFAULT, onMetrics, onLandmarks, onStatusChange }: WebcamViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const perclosRef = useRef(new PerclosTracker(PERCLOS_WINDOW_MS_DEFAULT));
  const alertMachineRef = useRef(new AlertStateMachine(DEFAULT_ALERT_OPTIONS));
  const earThresholdRef = useRef(earThreshold);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<SetupStatus>("loading");

  useEffect(() => {
    earThresholdRef.current = earThreshold;
  }, [earThreshold]);

  useEffect(() => {
    onStatusChange(status);
  }, [status, onStatusChange]);

  const processResult = useCallback(
    (landmarks: NormalizedLandmark[] | undefined, transformMatrix: { rows: number; columns: number; data: number[] } | undefined, timestampMs: number) => {
      if (!landmarks) {
        onLandmarks(null, videoRef.current);
        onMetrics({ ear: 0, perclos: perclosRef.current.perclos(), yawDeg: 0, pitchDeg: 0, alertLevel: "ok", faceDetected: false });
        return;
      }

      const ear = computeEAR(landmarks);
      const eyesClosed = ear < earThresholdRef.current;
      perclosRef.current.update(timestampMs, eyesClosed);
      const perclos = perclosRef.current.perclos();

      const angles = transformMatrix ? decomposeRotation(transformMatrix) : { yawDeg: 0, pitchDeg: 0, rollDeg: 0 };
      const headTurnedAway = isHeadTurnedAway(angles);

      const alertLevel = alertMachineRef.current.update(timestampMs, eyesClosed, headTurnedAway, perclos);

      onLandmarks(landmarks, videoRef.current);
      onMetrics({ ear, perclos, yawDeg: angles.yawDeg, pitchDeg: angles.pitchDeg, alertLevel, faceDetected: true });
    },
    [onMetrics, onLandmarks]
  );

  useEffect(() => {
    let cancelled = false;
    let rafId: number | null = null;
    let usingRvfc = false;

    async function setup() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        setStatus("ready");

        const detect = (timestampMs: number) => {
          if (cancelled || !landmarkerRef.current || !videoRef.current) return;
          const result = landmarkerRef.current.detectForVideo(videoRef.current, timestampMs);
          const landmarks = result.faceLandmarks?.[0];
          const matrix = result.facialTransformationMatrixes?.[0];
          processResult(landmarks, matrix, timestampMs);
        };

        // requestVideoFrameCallback gives per-decoded-frame timing (more
        // accurate than a raw rAF loop for video), but isn't universally
        // supported - fall back to rAF using performance.now().
        const anyVideo = video as HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
        };
        if (typeof anyVideo.requestVideoFrameCallback === "function") {
          usingRvfc = true;
          const loop = (now: number) => {
            if (cancelled) return;
            detect(now);
            anyVideo.requestVideoFrameCallback?.(loop);
          };
          anyVideo.requestVideoFrameCallback(loop);
        } else {
          const loop = () => {
            if (cancelled) return;
            detect(performance.now());
            rafId = requestAnimationFrame(loop);
          };
          rafId = requestAnimationFrame(loop);
        }
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        setStatus(name === "NotAllowedError" || name === "PermissionDeniedError" ? "camera-denied" : "error");
        console.error("Vigil setup failed:", err);
      }
    }

    setup();

    return () => {
      cancelled = true;
      void usingRvfc;
      if (rafId !== null) cancelAnimationFrame(rafId);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processResult]);

  return <video ref={videoRef} className="w-full h-full object-cover block" playsInline muted aria-label="Live webcam feed" />;
}
