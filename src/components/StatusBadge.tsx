'use client';

interface StatusBadgeProps {
    label: string;
    status: 'online' | 'warning' | 'critical' | 'offline';
}

export default function StatusBadge({ label, status }: StatusBadgeProps) {
    return (
        <div className={`status-badge ${status}`}>
            <span className="dot" />
            {label}
        </div>
    );
}
