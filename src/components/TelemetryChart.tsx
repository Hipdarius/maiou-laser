'use client';

import { memo, useState, useEffect } from 'react';
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
    const [isLight, setIsLight] = useState(false);

    useEffect(() => {
        const check = () => setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
        check();
        const observer = new MutationObserver(check);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(48,54,61,0.8)';
    const axisColor = isLight ? '#d0d7de' : '#30363d';
    const tickColor = isLight ? '#656d76' : '#6e7681';
    const tooltipBg = isLight ? '#ffffff' : '#1c2128';
    const tooltipBorder = isLight ? '#d0d7de' : '#30363d';
    const tooltipText = isLight ? '#1f2328' : '#e6edf3';
    const cursorColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    const refLabelColor = isLight ? '#656d76' : '#8b949e';

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
                            <stop offset="0%" stopColor={color} stopOpacity={isLight ? 0.2 : 0.3} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke={axisColor} tick={{ fontSize: 10, fill: tickColor }} interval="preserveStartEnd" />
                    <YAxis stroke={axisColor} tick={{ fontSize: 10, fill: tickColor }} width={45} domain={yDomain} />
                    <Tooltip
                        contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: tooltipText }}
                        cursor={{ stroke: cursorColor, strokeWidth: 1 }}
                        labelFormatter={formatTime}
                        formatter={(value: unknown) => {
                            const num = typeof value === 'number' ? value : 0;
                            return [`${num >= 10 ? num.toFixed(1) : num.toFixed(3)} ${unit}`, label];
                        }}
                    />
                    {referenceThreshold && (
                        <ReferenceLine y={referenceThreshold.value} stroke={referenceThreshold.color ?? '#f85149'} strokeDasharray="4 2" label={{ value: referenceThreshold.label, fill: refLabelColor, fontSize: 10, position: 'insideTopRight' }} />
                    )}
                    <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} dot={false} isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export default memo(TelemetryChart);
