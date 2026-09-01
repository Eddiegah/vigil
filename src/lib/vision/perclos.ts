interface Sample {
  t: number;
  closed: boolean;
}

/**
 * PERCLOS ("percentage of eyelid closure over the pupil over time") -
 * originated in Wierwille et al. 1994, NHTSA/FHWA report DOT HS 808 247.
 * The standard PERCLOS80/P80 variant measures the fraction of a rolling
 * time window during which the eye is >=80% closed. This tracker
 * approximates "closed" as EAR falling below a configured threshold
 * (see ear.ts) rather than a directly-measured pupil-occlusion
 * percentage - a documented simplification shared by most practical
 * EAR-based PERCLOS implementations, not a literal reproduction of the
 * original pupil-tracking methodology.
 *
 * Time-weighted, not sample-count-weighted: each recorded state is
 * assumed to hold until the next sample arrives, so frame-rate jitter
 * doesn't skew the result. Reports over whatever history is actually
 * available (never more than `windowMs`, but honestly less before the
 * window first fills) rather than padding with an assumed prior state.
 */
export class PerclosTracker {
  private samples: Sample[] = [];

  constructor(private readonly windowMs: number) {}

  update(t: number, closed: boolean): void {
    this.samples.push({ t, closed });
    const cutoff = t - this.windowMs;
    let dropTo = 0;
    for (let i = 0; i < this.samples.length - 1; i++) {
      if (this.samples[i + 1].t <= cutoff) dropTo = i + 1;
      else break;
    }
    if (dropTo > 0) this.samples.splice(0, dropTo);
  }

  /** Fraction (0-1) of the available window duration the eyes were closed. 0 with fewer than 2 samples. */
  perclos(): number {
    if (this.samples.length < 2) return 0;
    const latest = this.samples[this.samples.length - 1].t;
    const cutoff = latest - this.windowMs;

    let closedDuration = 0;
    let totalDuration = 0;
    for (let i = 0; i < this.samples.length - 1; i++) {
      const a = this.samples[i];
      const b = this.samples[i + 1];
      const segStart = Math.max(a.t, cutoff);
      const segEnd = b.t;
      if (segEnd <= segStart) continue;
      const duration = segEnd - segStart;
      totalDuration += duration;
      if (a.closed) closedDuration += duration;
    }
    return totalDuration > 0 ? closedDuration / totalDuration : 0;
  }

  reset(): void {
    this.samples = [];
  }
}

/**
 * Real alert-threshold spread found in the literature is wide (10-40%
 * depending on study/window length). The most specific citable number
 * is Lin et al. 2012, Journal of Vision 12(9):546, doi:10.1167/12.9.546,
 * proposing ~10-15% for detecting a ~1-second microsleep. Shipped here
 * as a cited default, not an invented constant - user-adjustable in the UI.
 */
export const PERCLOS_ALERT_THRESHOLD_DEFAULT = 0.15;
export const PERCLOS_WINDOW_MS_DEFAULT = 30_000;
