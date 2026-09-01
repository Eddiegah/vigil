import { describe, expect, it } from "vitest";
import { AlertStateMachine, DEFAULT_ALERT_OPTIONS } from "@/lib/alerts/alertState";

describe("AlertStateMachine", () => {
  it("does not fire drowsy on a single normal blink (~200ms closure)", () => {
    const machine = new AlertStateMachine();
    expect(machine.update(0, true, false, 0)).toBe("ok");
    expect(machine.update(200, false, false, 0)).toBe("ok");
    expect(machine.update(400, false, false, 0)).toBe("ok");
  });

  it("fires drowsy once eyes stay closed past the configured duration", () => {
    const machine = new AlertStateMachine();
    expect(machine.update(0, true, false, 0)).toBe("ok");
    expect(machine.update(1000, true, false, 0)).toBe("ok"); // 1000ms < 1500ms threshold
    expect(machine.update(1600, true, false, 0)).toBe("drowsy"); // 1600ms >= threshold
  });

  it("clears drowsy immediately once eyes reopen and perclos is back below threshold", () => {
    const machine = new AlertStateMachine();
    machine.update(0, true, false, 0);
    expect(machine.update(1600, true, false, 0)).toBe("drowsy");
    expect(machine.update(1700, false, false, 0)).toBe("ok");
  });

  it("fires distracted once the head stays turned away past the configured duration", () => {
    const machine = new AlertStateMachine();
    expect(machine.update(0, false, true, 0)).toBe("ok");
    expect(machine.update(1000, false, true, 0)).toBe("ok"); // 1000ms < 2000ms threshold
    expect(machine.update(2100, false, true, 0)).toBe("distracted");
  });

  it("does not fire distracted on a brief glance away", () => {
    const machine = new AlertStateMachine();
    expect(machine.update(0, false, true, 0)).toBe("ok");
    expect(machine.update(500, false, false, 0)).toBe("ok");
    expect(machine.update(3000, false, false, 0)).toBe("ok");
  });

  it("fires drowsy from PERCLOS alone, even with eyes open right now", () => {
    const machine = new AlertStateMachine();
    expect(machine.update(0, false, false, DEFAULT_ALERT_OPTIONS.perclosAlertThreshold + 0.05)).toBe("drowsy");
  });

  it("prioritizes drowsy over distracted when both conditions are simultaneously met", () => {
    const machine = new AlertStateMachine();
    machine.update(0, true, true, 0);
    const level = machine.update(2100, true, true, 0);
    expect(level).toBe("drowsy");
  });

  it("reset() clears sustained-duration tracking", () => {
    const machine = new AlertStateMachine();
    machine.update(0, true, false, 0);
    machine.update(1000, true, false, 0);
    machine.reset();
    // A fresh closure starting "now" (t=1000) must not inherit the prior duration.
    expect(machine.update(1000, true, false, 0)).toBe("ok");
    expect(machine.update(1400, true, false, 0)).toBe("ok");
  });
});
