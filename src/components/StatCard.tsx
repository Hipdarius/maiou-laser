'use client';

import { memo } from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    unit?: string;
    sub?: string;
    accentColor?: string;
    trend?: number;
    trendUnit?: string;
    alert?: boolean;
    icon?: string;
    sparkline?: number[];
}

function formatValue(value: number): string {
    if (value >= 1000) return value.toFixed(0);
    if (value >= 10) return value.toFixed(1);
    if (value >= 1) return value.toFixed(2);
    return value.toFixed(3);
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const W = 80, H = 24;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - ((v - min) / range) * H;
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg width={W} height={H} className="stat-sparkline">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function StatCard({ label, value, unit, sub, accentColor, trend, trendUnit, alert, icon, sparkline }: StatCardProps) {
    const trendDir = trend == null ? null : Math.abs(trend) < 0.001 ? 'stable' : trend > 0 ? 'up' : 'down';
    const trendSymbol = trendDir === 'up' ? '▲' : trendDir === 'down' ? '▼' : '—';
    const trendDisplay = trend != null ? `${trendSymbol} ${Math.abs(trend) >= 1 ? Math.abs(trend).toFixed(1) : Math.abs(trend).toFixed(3)}${trendUnit ?? unit ?? ''}` : null;

    return (
        <div className={`stat-card${alert ? ' stat-card--alert' : ''}`} style={accentColor ? { '--card-accent': accentColor } as React.CSSProperties : undefined}>
            {icon && <span className="stat-icon">{icon}</span>}
            <div className="stat-label">{label}</div>
            <div className="stat-value">
                {typeof value === 'number' ? formatValue(value) : value}
                {unit && <span className="stat-unit">{unit}</span>}
            </div>
            {sub && <div className="stat-sub">{sub}</div>}
            {trendDisplay && <div className={`stat-trend ${trendDir}`}>{trendDisplay}</div>}
            {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} color={accentColor ?? '#58a6ff'} />}
        </div>
    );
}

export default memo(StatCard);
