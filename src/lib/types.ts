// ─── BeamDock Telemetry Types ───────────────────────────────────────────────
// Shared between firmware, backend, and frontend.
// When ESP32 hardware arrives, it will POST the same TelemetryFrame shape.

export interface TelemetryFrame {
    timestamp: string;           // ISO 8601
    session_id: string;
    transmitter_on: boolean;
    beam_locked: boolean;
    safety_ok: boolean;
    receiver_voltage: number;    // V
    receiver_current: number;    // A
    received_power: number;      // W (derived: V × A)
    supercap_voltage: number;    // V
    energy_delivered_j: number;  // J (cumulative)
    distance_cm: number;         // cm
    temperature_c: number;       // °C
}

export interface EventEntry {
    id?: number;
    timestamp: string;           // ISO 8601
    session_id: string;
    type: 'info' | 'warning' | 'critical';
    message: string;
}

export interface SessionSummary {
    session_id: string;
    started_at: string;
    frame_count: number;
    total_energy_j: number;
    peak_power_w: number;
    event_count: number;
}
