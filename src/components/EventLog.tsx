'use client';

interface EventEntry {
    id?: number;
    timestamp: string;
    session_id: string;
    type: 'info' | 'warning' | 'critical';
    message: string;
}

interface EventLogProps {
    events: EventEntry[];
    maxItems?: number;
}

export default function EventLog({ events, maxItems = 20 }: EventLogProps) {
    const formatTime = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const displayed = events.slice(0, maxItems);

    if (displayed.length === 0) {
        return (
            <div className="empty-state">
                <div className="icon">📡</div>
                <p>No events recorded yet</p>
            </div>
        );
    }

    return (
        <div className="event-list">
            {displayed.map((event, i) => (
                <div key={event.id ?? i} className={`event-item ${event.type}`}>
                    <span className="event-time" title={new Date(event.timestamp).toLocaleString()}>
                        {formatTime(event.timestamp)}
                    </span>
                    <span className={`event-type ${event.type}`}>{event.type}</span>
                    <span className="event-session mono">{event.session_id.slice(0, 6)}</span>
                    <span className="event-message">{event.message}</span>
                </div>
            ))}
        </div>
    );
}
