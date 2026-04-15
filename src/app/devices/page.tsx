'use client';

import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '@/components/StatusBadge';
import TelemetryChart from '@/components/TelemetryChart';

interface TelemetryFrame {
    timestamp: string;
    session_id: string;
    transmitter_on: boolean;
    beam_locked: boolean;
    safety_ok: boolean;
    receiver_voltage: number;
    receiver_current: number;
    received_power: number;
    supercap_voltage: number;
    energy_delivered_j: number;
    distance_cm: number;
    temperature_c: number;
}

const POLL_MS = 3000;

export default function DevicesPage() {
    const [latest, setLatest] = useState<TelemetryFrame | null>(null);
    const [history, setHistory] = useState<TelemetryFrame[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const [telRes, histRes] = await Promise.all([
                fetch('/api/telemetry'),
                fetch('/api/telemetry/history?limit=30'),
            ]);
            if (telRes.ok) setLatest(await telRes.json());
            if (histRes.ok) {
                const data = await histRes.json();
                setHistory(data.frames || []);
            }
        } catch (e) {
            console.error('Fetch error:', e);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, POLL_MS);
        return () => clearInterval(interval);
    }, [fetchData]);

    const supercapPct = ((latest?.supercap_voltage ?? 0) / 2.7) * 100;
    const tempColor = latest
        ? latest.temperature_c > 50 ? 'var(--color-critical)'
            : latest.temperature_c > 40 ? 'var(--color-warning)'
                : 'var(--color-online)'
        : 'var(--text-secondary)';

    const formatUpdated = (ts?: string) => {
        if (!ts) return '—';
        return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h2>Device Status</h2>
                <p>Transmitter and receiver module overview</p>
            </div>

            <div className="device-grid">
                <div className="device-card" style={{ '--card-gradient': 'var(--gradient-power)' } as React.CSSProperties}>
                    <div className="device-header">
                        <h3>🔆 TX — IR LED Array</h3>
                        <StatusBadge label={latest?.transmitter_on ? 'Active' : 'Standby'} status={latest?.transmitter_on ? 'online' : 'offline'} />
                    </div>
                    <div className="device-specs">
                        <div className="device-spec"><span className="label">Wavelength</span><span className="value">940 nm</span></div>
                        <div className="device-spec"><span className="label">Beam Lock</span><span className="value" style={{ color: latest?.beam_locked ? 'var(--color-online)' : 'var(--color-warning)' }}>{latest?.beam_locked ? 'LOCKED' : 'SEEKING'}</span></div>
                        <div className="device-spec"><span className="label">Safety Interlock</span><span className="value" style={{ color: latest?.safety_ok ? 'var(--color-online)' : 'var(--color-critical)' }}>{latest?.safety_ok ? 'OK' : 'ALERT'}</span></div>
                        <div className="device-spec"><span className="label">Distance</span><span className="value">{latest?.distance_cm?.toFixed(1) ?? '—'} cm</span></div>
                        <div className="device-spec"><span className="label">Temperature</span><span className="value" style={{ color: tempColor }}>{latest?.temperature_c?.toFixed(1) ?? '—'} °C</span></div>
                        <div className="device-spec"><span className="label">Session</span><span className="value mono" style={{ fontSize: 12 }}>{latest?.session_id?.slice(0, 8) ?? '—'}</span></div>
                    </div>
                    <div className="device-footer"><span>940 nm IR LED Array</span><span>Updated: {formatUpdated(latest?.timestamp)}</span></div>
                </div>

                <div className="device-card" style={{ '--card-gradient': 'var(--gradient-energy)' } as React.CSSProperties}>
                    <div className="device-header">
                        <h3>⚡ RX — Silicon PV Panel</h3>
                        <StatusBadge label={latest && latest.received_power > 0.5 ? 'Harvesting' : 'Idle'} status={latest && latest.received_power > 0.5 ? 'online' : 'offline'} />
                    </div>
                    <div className="device-specs">
                        <div className="device-spec"><span className="label">Output Voltage</span><span className="value">{latest?.receiver_voltage?.toFixed(3) ?? '—'} V</span></div>
                        <div className="device-spec"><span className="label">Output Current</span><span className="value">{latest?.receiver_current?.toFixed(3) ?? '—'} A</span></div>
                        <div className="device-spec"><span className="label">Received Power</span><span className="value">{latest?.received_power?.toFixed(3) ?? '—'} W</span></div>
                        <div className="device-spec"><span className="label">Supercap Voltage</span><span className="value">{latest?.supercap_voltage?.toFixed(3) ?? '—'} V</span></div>
                    </div>
                    <div style={{ marginTop: 12, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                            <span>Supercap Charge</span><span className="mono">{supercapPct.toFixed(0)}% / 2.7V</span>
                        </div>
                        <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${Math.min(100, supercapPct)}%`, background: 'var(--chart-supercap)' }} /></div>
                    </div>
                    <div className="device-specs">
                        <div className="device-spec"><span className="label">Energy Delivered</span><span className="value">{latest?.energy_delivered_j?.toFixed(1) ?? '—'} J</span></div>
                        <div className="device-spec"><span className="label">Type</span><span className="value" style={{ fontSize: 13 }}>DC-DC → Supercap</span></div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <TelemetryChart data={history} dataKey="received_power" color="#f5a623" label="Received Power" unit="W" height={100} currentValue={latest?.received_power} />
                    </div>
                    <div className="device-footer"><span>Silicon PV → DC-DC → Supercap</span><span>Updated: {formatUpdated(latest?.timestamp)}</span></div>
                </div>

                <div className="device-card" style={{ '--card-gradient': 'linear-gradient(135deg, #bc8cff, #58a6ff)' } as React.CSSProperties}>
                    <div className="device-header">
                        <h3>🧠 MCU — ESP32</h3>
                        <StatusBadge label="Simulated" status="warning" />
                    </div>
                    <div className="device-specs">
                        <div className="device-spec"><span className="label">Mode</span><span className="value" style={{ fontSize: 13 }}>Digital Twin</span></div>
                        <div className="device-spec"><span className="label">Protocol</span><span className="value" style={{ fontSize: 13 }}>HTTP POST</span></div>
                        <div className="device-spec"><span className="label">Telemetry Rate</span><span className="value">1 Hz</span></div>
                        <div className="device-spec"><span className="label">Firmware</span><span className="value" style={{ fontSize: 13, color: 'var(--color-warning)' }}>Pending HW</span></div>
                    </div>
                    <div className="device-footer"><span>ESP32 · Hardware integration pending</span><span>Updated: {formatUpdated(latest?.timestamp)}</span></div>
                </div>
            </div>
        </div>
    );
}
