'use client';

import { memo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartData = Array<any>;

interface ReferenceThreshold {
    value: number;
    label: string;
    color?: string;
}

interface TelemetryChartProps {
    data: ChartData;
    dataKey: string;
    color: string;
    label: string;
    unit?: string;
    height?: number;
    currentValue?: number;
    referenceThreshold?: ReferenceThreshold;
    yDomain?: [number | 'auto', number | 'auto'];
}

const formatTime = (ts: unknown) => {
    if (!ts || typeof ts !== 'string') return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

function TelemetryChart({
    data, dataKey, color, label, unit = '', height = 200,
    currentValue, referenceThreshold, yDomain,
}: TelemetryChartProps) {
    return (
        <div className="chart-card">
            <div className="chart-card-header">
                <h3>{label} {unit && <span style={{ opacity: 0.5 }}>({unit})</span>}</h3>
                {currentValue != null && (
                    <span className="chart-current-value" style={{ color }}>
                        {currentValue >= 10 ? currentValue.toFixed(1) : currentValue.toFixed(3)}{unit}
                    </span>
                )}
            </div>
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(48,54,61,0.8)" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#30363d" tick={{ fontSize: 10, fill: '#6e7681' }} interval="preserveStartEnd" />
                    <YAxis stroke="#30363d" tick={{ fontSize: 10, fill: '#6e7681' }} width={45} domain={yDomain} />
                    <Tooltip
                        contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: '8px', fontSize: '12px', color: '#e6edf3' }}
                        cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                        labelFormatter={formatTime}
                        formatter={(value: unknown) => {
                            const num = typeof value === 'number' ? value : 0;
                            return [`${num >= 10 ? num.toFixed(1) : num.toFixed(3)} ${unit}`, label];
                        }}
                    />
                    {referenceThreshold && (
                        <ReferenceLine y={referenceThreshold.value} stroke={referenceThreshold.color ?? '#f85149'} strokeDasharray="4 2" label={{ value: referenceThreshold.label, fill: '#8b949e', fontSize: 10, position: 'insideTopRight' }} />
                    )}
                    <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} dot={false} isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export default memo(TelemetryChart);
