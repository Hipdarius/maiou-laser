'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import TelemetryChart from '@/components/TelemetryChart';
import EventLog from '@/components/EventLog';

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

interface EventEntry {
  id?: number;
  timestamp: string;
  session_id: string;
  type: 'info' | 'warning' | 'critical';
  message: string;
}

const TARGET_POWER = 4.42; // W — steady-state target

export default function DashboardPage() {
  const [latest, setLatest] = useState<TelemetryFrame | null>(null);
  const [history, setHistory] = useState<TelemetryFrame[]>([]);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const prevRef = useRef<TelemetryFrame | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [telRes, histRes, evtRes] = await Promise.all([
        fetch('/api/telemetry'),
        fetch('/api/telemetry/history?limit=60'),
        fetch('/api/events?limit=10'),
      ]);

      if (telRes.ok) {
        const data = await telRes.json();
        prevRef.current = latest;
        setLatest(data);
      }
      if (histRes.ok) {
        const data = await histRes.json();
        setHistory(data.frames || []);
      }
      if (evtRes.ok) {
        const data = await evtRes.json();
        setEvents(data.events || []);
      }
      setError(null);
    } catch (e) {
      setError('Connection lost');
      console.error('Fetch error:', e);
    }
  }, [latest]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const prev = prevRef.current;
  const trend = (key: keyof TelemetryFrame): number | undefined => {
    if (!latest || !prev) return undefined;
    const a = latest[key], b = prev[key];
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return undefined;
  };

  const efficiency = latest ? (latest.received_power / TARGET_POWER) * 100 : 0;
  const sparkVoltage = history.slice(-20).map(f => f.receiver_voltage);
  const sparkPower = history.slice(-20).map(f => f.received_power);
  const sparkTemp = history.slice(-20).map(f => f.temperature_c);
  const sparkEnergy = history.slice(-20).map(f => f.energy_delivered_j);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Mission Control</h2>
        <p>Real-time optical power beaming telemetry</p>
      </div>

      {error && (
        <div className="status-badge critical" style={{ marginBottom: 16 }}>
          <span className="dot" /> {error}
        </div>
      )}

      {/* Beam Health Bar */}
      <div className="beam-health-bar">
        <span className="beam-health-label">System Status</span>
        <span className={`check ${latest?.transmitter_on ? 'go' : 'nogo'}`}>TX</span>
        <span className={`check ${latest?.beam_locked ? 'go' : 'nogo'}`}>LOCK</span>
        <span className={`check ${latest?.safety_ok ? 'go' : 'nogo'}`}>SAFE</span>
        <span className="sep" />
        <StatusBadge
          label={`Session ${latest?.session_id?.slice(0, 8) ?? '—'}`}
          status="online"
        />
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Received Power"
          value={latest?.received_power ?? 0}
          unit="W"
          accentColor="var(--chart-power)"
          trend={trend('received_power')}
          icon="☀"
          sparkline={sparkPower}
        />
        <StatCard
          label="Efficiency"
          value={efficiency}
          unit="%"
          accentColor="var(--gradient-beam)"
          alert={efficiency > 0 && efficiency < 30}
          sub={efficiency > 0 ? (efficiency >= 80 ? 'Excellent' : efficiency >= 50 ? 'Good' : 'Low') : '—'}
          icon="◎"
        />
        <StatCard
          label="Receiver Voltage"
          value={latest?.receiver_voltage ?? 0}
          unit="V"
          accentColor="var(--chart-voltage)"
          trend={trend('receiver_voltage')}
          sparkline={sparkVoltage}
          icon="⚡"
        />
        <StatCard
          label="Receiver Current"
          value={latest?.receiver_current ?? 0}
          unit="A"
          accentColor="var(--chart-current)"
          trend={trend('receiver_current')}
          icon="⟳"
        />
        <StatCard
          label="Supercap Voltage"
          value={latest?.supercap_voltage ?? 0}
          unit="V"
          accentColor="var(--chart-supercap)"
          sub={latest ? `${((latest.supercap_voltage / 2.7) * 100).toFixed(0)}% charged` : undefined}
          icon="🔋"
        />
        <StatCard
          label="Energy Delivered"
          value={latest?.energy_delivered_j ?? 0}
          unit="J"
          accentColor="var(--chart-energy)"
          sparkline={sparkEnergy}
          icon="∑"
        />
        <StatCard
          label="Temperature"
          value={latest?.temperature_c ?? 0}
          unit="°C"
          sub={latest && latest.temperature_c > 45 ? '⚠ High' : 'Normal'}
          accentColor="var(--chart-temp)"
          alert={latest ? latest.temperature_c > 45 : false}
          trend={trend('temperature_c')}
          sparkline={sparkTemp}
          icon="🌡"
        />
        <StatCard
          label="Distance"
          value={latest?.distance_cm ?? 0}
          unit="cm"
          accentColor="var(--gradient-beam)"
          trend={trend('distance_cm')}
          icon="↔"
        />
      </div>

      {/* Charts */}
      <div className="section-title">
        <span className="icon">📊</span> Live Telemetry
      </div>
      <div className="chart-grid">
        <TelemetryChart
          data={history}
          dataKey="receiver_voltage"
          color="#60a5fa"
          label="Voltage"
          unit="V"
          currentValue={latest?.receiver_voltage}
          referenceThreshold={{ value: 5.2, label: 'Target', color: 'rgba(96,165,250,0.4)' }}
        />
        <TelemetryChart
          data={history}
          dataKey="receiver_current"
          color="#34d399"
          label="Current"
          unit="A"
          currentValue={latest?.receiver_current}
        />
        <TelemetryChart
          data={history}
          dataKey="received_power"
          color="#fbbf24"
          label="Power"
          unit="W"
          currentValue={latest?.received_power}
          referenceThreshold={{ value: TARGET_POWER, label: 'Target', color: 'rgba(251,191,36,0.4)' }}
        />
        <TelemetryChart
          data={history}
          dataKey="supercap_voltage"
          color="#a78bfa"
          label="Supercap"
          unit="V"
          currentValue={latest?.supercap_voltage}
          yDomain={[0, 2.7]}
        />
      </div>

      {/* Recent Events */}
      <div className="section-title" style={{ marginTop: 8 }}>
        <span className="icon">📋</span> Recent Events
      </div>
      <EventLog events={events} maxItems={8} />
    </div>
  );
}
