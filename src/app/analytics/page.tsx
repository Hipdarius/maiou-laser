'use client';

import { useState, useEffect, useCallback } from 'react';
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

const TARGET_POWER = 4.42;

const TIME_WINDOWS = [
    { n: 60, label: '1 min' },
    { n: 120, label: '2 min' },
    { n: 300, label: '5 min' },
];

export default function AnalyticsPage() {
    const [history, setHistory] = useState<TelemetryFrame[]>([]);
    const [limit, setLimit] = useState(120);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/telemetry/history?limit=${limit}`);
            if (res.ok) {
                const data = await res.json();
                setHistory(data.frames || []);
            }
        } catch (e) {
            console.error('Fetch error:', e);
        }
    }, [limit]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const historyWithEff = history.map(f => ({
        ...f,
        efficiency_pct: (f.received_power / TARGET_POWER) * 100,
    }));

    const powers = history.map(f => f.received_power);
    const peakPower = powers.length ? Math.max(...powers) : 0;
    const avgPower = powers.length ? powers.reduce((a, b) => a + b, 0) / powers.length : 0;
    const totalEnergy = history.length ? history[history.length - 1].energy_delivered_j : 0;
    const lockedFrames = history.filter(f => f.beam_locked).length;
    const uptimePct = history.length ? (lockedFrames / history.length) * 100 : 0;
    const latest = history.length ? history[history.length - 1] : null;

    return (
        <div className="fade-in">
            <div className="page-header">
                <h2>Analytics</h2>
                <p>Detailed power transfer analysis and historical data</p>
            </div>

            <div className="btn-group">
                {TIME_WINDOWS.map(({ n, label }) => (
                    <button
                        key={n}
                        onClick={() => setLimit(n)}
                        className={`btn${limit === n ? ' active' : ''}`}
                    >
                        {label}
                    </button>
                ))}
                <span className="text-muted" style={{ fontSize: 12, marginLeft: 4 }}>
                    {history.length} data points
                </span>
            </div>

            {/* Summary Stats */}
            <div className="summary-stats">
                <div className="summary-stat">
                    <span className="ss-label">Peak Power</span>
                    <span className="ss-value" style={{ color: 'var(--chart-power)' }}>{peakPower.toFixed(2)}<span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 3 }}>W</span></span>
                </div>
                <div className="summary-stat">
                    <span className="ss-label">Avg Power</span>
                    <span className="ss-value" style={{ color: 'var(--chart-voltage)' }}>{avgPower.toFixed(2)}<span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 3 }}>W</span></span>
                </div>
                <div className="summary-stat">
                    <span className="ss-label">Total Energy</span>
                    <span className="ss-value" style={{ color: 'var(--chart-energy)' }}>{totalEnergy.toFixed(1)}<span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 3 }}>J</span></span>
                </div>
                <div className="summary-stat">
                    <span className="ss-label">Beam Uptime</span>
                    <span className="ss-value" style={{ color: uptimePct > 80 ? 'var(--color-online)' : uptimePct > 50 ? 'var(--color-warning)' : 'var(--color-critical)' }}>{uptimePct.toFixed(0)}<span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 3 }}>%</span></span>
                </div>
                <div className="summary-stat">
                    <span className="ss-label">Efficiency</span>
                    <span className="ss-value" style={{ color: 'var(--chart-supercap)' }}>{avgPower > 0 ? ((avgPower / TARGET_POWER) * 100).toFixed(0) : '0'}<span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 3 }}>%</span></span>
                </div>
                <div className="summary-stat">
                    <span className="ss-label">Temperature</span>
                    <span className="ss-value" style={{ color: latest && latest.temperature_c > 45 ? 'var(--color-warning)' : 'var(--text-primary)' }}>{latest?.temperature_c.toFixed(1) ?? '—'}<span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 3 }}>°C</span></span>
                </div>
            </div>

            <div className="chart-grid" style={{ gridTemplateColumns: '1fr' }}>
                <TelemetryChart
                    data={historyWithEff}
                    dataKey="received_power"
                    color="#fbbf24"
                    label="Received Power"
                    unit="W"
                    height={280}
                    currentValue={latest?.received_power}
                    referenceThreshold={{ value: TARGET_POWER, label: 'Target 4.42W', color: 'rgba(251,191,36,0.5)' }}
                />
            </div>

            <div className="chart-grid">
                <TelemetryChart
                    data={history}
                    dataKey="receiver_voltage"
                    color="#60a5fa"
                    label="Receiver Voltage"
                    unit="V"
                    height={220}
                    currentValue={latest?.receiver_voltage}
                    referenceThreshold={{ value: 5.2, label: 'Target', color: 'rgba(96,165,250,0.4)' }}
                />
                <TelemetryChart
                    data={history}
                    dataKey="receiver_current"
                    color="#34d399"
                    label="Receiver Current"
                    unit="A"
                    height={220}
                    currentValue={latest?.receiver_current}
                />
            </div>

            <div className="chart-grid">
                <TelemetryChart
                    data={history}
                    dataKey="supercap_voltage"
                    color="#a78bfa"
                    label="Supercap Voltage"
                    unit="V"
                    height={220}
                    currentValue={latest?.supercap_voltage}
                    yDomain={[0, 2.7]}
                />
                <TelemetryChart
                    data={history}
                    dataKey="energy_delivered_j"
                    color="#2dd4bf"
                    label="Cumulative Energy"
                    unit="J"
                    height={220}
                    currentValue={latest?.energy_delivered_j}
                />
            </div>

            <div className="chart-grid">
                <TelemetryChart
                    data={historyWithEff}
                    dataKey="efficiency_pct"
                    color="#c084fc"
                    label="Beam Efficiency"
                    unit="%"
                    height={220}
                    currentValue={latest ? (latest.received_power / TARGET_POWER) * 100 : undefined}
                    yDomain={[0, 110]}
                    referenceThreshold={{ value: 100, label: 'Max', color: 'rgba(192,132,252,0.4)' }}
                />
                <TelemetryChart
                    data={history}
                    dataKey="temperature_c"
                    color="#f87171"
                    label="Temperature"
                    unit="°C"
                    height={220}
                    currentValue={latest?.temperature_c}
                    referenceThreshold={{ value: 45, label: 'Warning', color: 'rgba(248,113,113,0.5)' }}
                />
            </div>

            <div className="chart-grid">
                <TelemetryChart
                    data={history}
                    dataKey="distance_cm"
                    color="#94a3b8"
                    label="Distance"
                    unit="cm"
                    height={220}
                    currentValue={latest?.distance_cm}
                />
            </div>
        </div>
    );
}
