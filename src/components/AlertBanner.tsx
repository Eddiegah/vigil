"use client";

import { useEffect, useRef } from "react";
import type { AlertLevel } from "@/lib/alerts/alertState";

function beep(ctx: AudioContext, frequency: number, durationMs: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frequency;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);
}

interface AlertBannerProps {
  level: AlertLevel;
}

/** Visual banner plus a short synthesized tone on each transition into an alert state - no audio asset, no licensing question, one oscillator beep per transition rather than a looping siren. */
export function AlertBanner({ level }: AlertBannerProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevLevelRef = useRef<AlertLevel>("ok");

  useEffect(() => {
    if (level !== prevLevelRef.current && (level === "drowsy" || level === "distracted")) {
      audioCtxRef.current ??= new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      beep(ctx, level === "drowsy" ? 880 : 660, level === "drowsy" ? 350 : 200);
    }
    prevLevelRef.current = level;
  }, [level]);

  useEffect(() => {
    return () => {
      void audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  if (level === "ok") {
    return <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-status-ok">Alert — eyes on the road</div>;
  }

  const isDrowsy = level === "drowsy";
  return (
    <div
      role="alert"
      className={`animate-pulse rounded-lg border px-4 py-3 text-sm font-semibold ${
        isDrowsy ? "border-status-drowsy bg-status-drowsy/10 text-status-drowsy" : "border-status-distracted bg-status-distracted/10 text-status-distracted"
      }`}
    >
      {isDrowsy ? "DROWSY — pull over and rest" : "DISTRACTED — eyes on the road"}
    </div>
  );
}
