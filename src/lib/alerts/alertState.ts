import { PERCLOS_ALERT_THRESHOLD_DEFAULT } from "@/lib/vision/perclos";

export type AlertLevel = "ok" | "distracted" | "drowsy";

export interface AlertStateOptions {
  /** Sustained continuous eye closure past this duration reads as a microsleep, not a blink - a normal voluntary/involuntary blink is roughly 100-400ms. */
  eyesClosedDurationMsForAlert: number;
  /** Sustained head-turned-away duration before raising a distraction alert. */
  headTurnedDurationMsForAlert: number;
  /** PERCLOS fraction (see perclos.ts) above which drowsy fires independently of the direct closed-eye timer - catches slow droopy-eyelid drowsiness that never fully closes long enough to trip the direct timer. */
  perclosAlertThreshold: number;
}

export const DEFAULT_ALERT_OPTIONS: AlertStateOptions = {
  eyesClosedDurationMsForAlert: 1500,
  headTurnedDurationMsForAlert: 2000,
  perclosAlertThreshold: PERCLOS_ALERT_THRESHOLD_DEFAULT,
};

/**
 * Debounced alert state: raw per-frame signals (is an eye closed right
 * now, is the head turned away right now) are noisy and would false-
 * alarm on every normal blink or momentary glance at a mirror. This
 * machine only raises an alert once a signal has held continuously for
 * its configured duration, and drops it the instant the underlying
 * condition clears - hysteresis on the "on" edge only, since there's no
 * safety cost to clearing an alert immediately once the driver's eyes
 * reopen or their head returns to center.
 */
export class AlertStateMachine {
  private eyesClosedSinceMs: number | null = null;
  private headTurnedSinceMs: number | null = null;

  constructor(private readonly opts: AlertStateOptions = DEFAULT_ALERT_OPTIONS) {}

  update(t: number, eyesClosed: boolean, headTurnedAway: boolean, perclos: number): AlertLevel {
    this.eyesClosedSinceMs = eyesClosed ? (this.eyesClosedSinceMs ?? t) : null;
    this.headTurnedSinceMs = headTurnedAway ? (this.headTurnedSinceMs ?? t) : null;

    const eyesClosedDuration = this.eyesClosedSinceMs !== null ? t - this.eyesClosedSinceMs : 0;
    const headTurnedDuration = this.headTurnedSinceMs !== null ? t - this.headTurnedSinceMs : 0;

    if (eyesClosedDuration >= this.opts.eyesClosedDurationMsForAlert || perclos >= this.opts.perclosAlertThreshold) {
      return "drowsy";
    }
    if (headTurnedDuration >= this.opts.headTurnedDurationMsForAlert) {
      return "distracted";
    }
    return "ok";
  }

  reset(): void {
    this.eyesClosedSinceMs = null;
    this.headTurnedSinceMs = null;
  }
}
