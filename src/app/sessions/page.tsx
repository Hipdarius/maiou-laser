'use client';

import { useState, useEffect, useCallback } from 'react';

interface SessionSummary {
    session_id: string;
    started_at: string;
    frame_count: number;
    total_energy_j: number;
    peak_power_w: number;
    event_count: number;
}

export default function SessionsPage() {
    const [sessions, setSessions] = useState<SessionSummary[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch (e) {
            console.error('Fetch error:', e);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const formatDate = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        });
    };

    const formatDuration = (frames: number) => {
        const secs = frames;
        if (secs < 60) return `${secs}s`;
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins}m ${s}s`;
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h2>Session History</h2>
                <p>Browse past power beaming sessions and their performance</p>
            </div>

            {sessions.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">📡</div>
                    <p>No sessions recorded yet. The simulator will start automatically.</p>
                </div>
            ) : (
                <div className="sessions-table-wrapper">
                <table className="sessions-table">
                    <thead>
                        <tr>
                            <th>Session ID</th>
                            <th>Started</th>
                            <th>Duration</th>
                            <th>Frames</th>
                            <th>Peak Power</th>
                            <th>Total Energy</th>
                            <th>Events</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((s) => (
                            <tr key={s.session_id}>
                                <td className="session-id-cell">{s.session_id.slice(0, 12)}</td>
                                <td>{formatDate(s.started_at)}</td>
                                <td className="mono">{formatDuration(s.frame_count)}</td>
                                <td className="mono">{s.frame_count}</td>
                                <td className="mono" style={{ color: 'var(--chart-power)' }}>{s.peak_power_w.toFixed(2)} W</td>
                                <td className="mono" style={{ color: 'var(--chart-energy)' }}>{s.total_energy_j.toFixed(1)} J</td>
                                <td className="mono">{s.event_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}
        </div>
    );
}
