"use client";

import { useEffect, useRef } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LEFT_EYE, RIGHT_EYE } from "@/lib/vision/landmarkIndices";

interface OverlayCanvasProps {
  landmarks: NormalizedLandmark[] | null;
  videoEl: HTMLVideoElement | null;
}

/**
 * Maps a video's native pixel coordinates onto the container's displayed
 * coordinates under `object-fit: cover` (center-cropped, uniformly
 * scaled) - the video element's `<video>` CSS uses `object-cover`, so a
 * raw landmark position needs this same crop/scale math to land in the
 * right spot rather than assuming a 1:1 or `object-contain` mapping.
 */
function coverTransform(containerW: number, containerH: number, videoW: number, videoH: number) {
  const scale = Math.max(containerW / videoW, containerH / videoH);
  const displayW = videoW * scale;
  const displayH = videoH * scale;
  const offsetX = (containerW - displayW) / 2;
  const offsetY = (containerH - displayH) / 2;
  return { scale, offsetX, offsetY };
}

export function OverlayCanvas({ landmarks, videoEl }: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !videoEl) return;

    const containerW = canvas.clientWidth;
    const containerH = canvas.clientHeight;
    if (canvas.width !== containerW || canvas.height !== containerH) {
      canvas.width = containerW;
      canvas.height = containerH;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || videoEl.videoWidth === 0) return;

    const { scale, offsetX, offsetY } = coverTransform(containerW, containerH, videoEl.videoWidth, videoEl.videoHeight);
    const toCanvas = (p: NormalizedLandmark) => ({
      x: offsetX + p.x * videoEl.videoWidth * scale,
      y: offsetY + p.y * videoEl.videoHeight * scale,
    });

    ctx.fillStyle = "#58a6ff";
    ctx.strokeStyle = "#58a6ffaa";
    ctx.lineWidth = 1.5;

    for (const eye of [RIGHT_EYE, LEFT_EYE]) {
      ctx.beginPath();
      eye.forEach((idx, i) => {
        const { x, y } = toCanvas(landmarks[idx]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();

      for (const idx of eye) {
        const { x, y } = toCanvas(landmarks[idx]);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [landmarks, videoEl]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />;
}
