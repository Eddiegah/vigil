"use client";

import { useCallback, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { WebcamView, type FrameMetrics, type SetupStatus } from "@/components/WebcamView";
import { OverlayCanvas } from "@/components/OverlayCanvas";
import { AlertBanner } from "@/components/AlertBanner";
import { EAR_THRESHOLD_DEFAULT, EAR_THRESHOLD_PAPER, EAR_THRESHOLD_PYIMAGESEARCH } from "@/lib/vision/ear";
import { PERCLOS_ALERT_THRESHOLD_DEFAULT } from "@/lib/vision/perclos";

const INITIAL_METRICS: FrameMetrics = { ear: 0, perclos: 0, yawDeg: 0, pitchDeg: 0, alertLevel: "ok", faceDetected: false };

export default function Home() {
  const [earThreshold, setEarThreshold] = useState(EAR_THRESHOLD_DEFAULT);
  const [metrics, setMetrics] = useState<FrameMetrics>(INITIAL_METRICS);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<SetupStatus>("loading");

  const handleLandmarks = useCallback((lm: NormalizedLandmark[] | null, video: HTMLVideoElement | null) => {
    setLandmarks(lm);
    setVideoEl(video);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Vigil</h1>
        <p className="mt-1 text-sm text-muted">
          A real-time driver drowsiness and attention monitor. Everything runs in your browser — the video feed and every computed
          number never leave your device.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface">
          <WebcamView earThreshold={earThreshold} onMetrics={setMetrics} onLandmarks={handleLandmarks} onStatusChange={setStatus} />
          <OverlayCanvas landmarks={landmarks} videoEl={videoEl} />

          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-muted">
              Loading face model and requesting camera access…
            </div>
          )}
          {status === "camera-denied" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 px-6 text-center text-sm text-status-drowsy">
              Camera access was denied. Vigil needs your webcam to work — grant permission and reload the page.
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 px-6 text-center text-sm text-status-drowsy">
              Something went wrong loading the face-tracking model. Check the console and try reloading.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <AlertBanner level={metrics.alertLevel} />

          <div className="rounded-lg border border-border bg-surface p-4 text-sm">
            <h2 className="mb-3 font-medium text-foreground">Live readout</h2>
            <dl className="grid grid-cols-2 gap-y-2 font-mono text-xs">
              <dt className="text-muted">Face detected</dt>
              <dd className="text-foreground">{metrics.faceDetected ? "yes" : "no"}</dd>
              <dt className="text-muted">EAR</dt>
              <dd className="text-foreground">{metrics.ear.toFixed(3)}</dd>
              <dt className="text-muted">PERCLOS</dt>
              <dd className="text-foreground">{(metrics.perclos * 100).toFixed(1)}%</dd>
              <dt className="text-muted">Yaw</dt>
              <dd className="text-foreground">{metrics.yawDeg.toFixed(1)}°</dd>
              <dt className="text-muted">Pitch</dt>
              <dd className="text-foreground">{metrics.pitchDeg.toFixed(1)}°</dd>
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4 text-sm">
            <h2 className="mb-3 font-medium text-foreground">Settings</h2>
            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-xs text-muted">
                <span>EAR closed-eye threshold</span>
                <span className="font-mono">{earThreshold.toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={0.15}
                max={0.35}
                step={0.01}
                value={earThreshold}
                onChange={(e) => setEarThreshold(Number(e.target.value))}
                className="accent-accent"
              />
              <span className="text-[11px] text-muted">
                Literature disagrees on one value: {EAR_THRESHOLD_PAPER.toFixed(1)} (Soukupová &amp; Čech 2016) vs.{" "}
                {EAR_THRESHOLD_PYIMAGESEARCH.toFixed(1)} (PyImageSearch). Default here is their midpoint — adjust to taste.
              </span>
            </label>
            <p className="mt-3 text-[11px] text-muted">
              PERCLOS alert threshold is fixed at {(PERCLOS_ALERT_THRESHOLD_DEFAULT * 100).toFixed(0)}% (Lin et al. 2012), sustained
              eye closure past 1.5s or head-turn past 2s trigger alerts directly.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
