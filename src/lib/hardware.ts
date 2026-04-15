// ─── Hardware Mode Tracking ─────────────────────────────────────────────────
// Tracks whether the system is receiving real hardware data or using simulation.
// When the ESP32 POSTs telemetry, the system automatically switches to hardware mode.
// If no hardware data arrives for TIMEOUT_MS, it falls back to simulation.

const TIMEOUT_MS = 10_000; // 10 seconds without hardware data → fall back to sim

let lastHardwareFrame = 0;
let hardwareFrameCount = 0;

export function recordHardwareFrame(): void {
    lastHardwareFrame = Date.now();
    hardwareFrameCount++;
}

export function getHardwareMode() {
    const now = Date.now();
    const active = lastHardwareFrame > 0 && (now - lastHardwareFrame) < TIMEOUT_MS;
    return {
        active,
        last_frame_at: lastHardwareFrame > 0 ? new Date(lastHardwareFrame).toISOString() : null,
        total_frames: hardwareFrameCount,
        source: active ? 'hardware' as const : 'simulator' as const,
    };
}
