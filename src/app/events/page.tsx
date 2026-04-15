'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import EventLog from '@/components/EventLog';

interface EventEntry {
    id?: number;
    timestamp: string;
    session_id: string;
    type: 'info' | 'warning' | 'critical';
    message: string;
}

type FilterType = 'all' | 'info' | 'warning' | 'critical';

const POLL_MS = 3000;

export default function EventsPage() {
    const [events, setEvents] = useState<EventEntry[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const prevCriticalCount = useRef(0);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/events?limit=100');
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
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

    const counts = {
        all: events.length,
        info: events.filter(e => e.type === 'info').length,
        warning: events.filter(e => e.type === 'warning').length,
        critical: events.filter(e => e.type === 'critical').length,
    };

    useEffect(() => {
        if (counts.critical > prevCriticalCount.current) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        prevCriticalCount.current = counts.critical;
    }, [counts.critical]);

    const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);

    const filterButtons: { type: FilterType; activeClass: string }[] = [
        { type: 'all', activeClass: 'active' },
        { type: 'info', activeClass: 'active-info' },
        { type: 'warning', activeClass: 'active-warning' },
        { type: 'critical', activeClass: 'active-critical' },
    ];

    return (
        <div className="fade-in">
            <div className="page-header">
                <h2>Event Log</h2>
                <p>Safety events, system alerts, and session activity</p>
            </div>

            <div className="btn-group">
                {filterButtons.map(({ type, activeClass }) => (
                    <button key={type} onClick={() => setFilter(type)} className={`btn${filter === type ? ` ${activeClass}` : ''}`}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                        <span className="event-count-badge">{counts[type]}</span>
                    </button>
                ))}
            </div>

            <EventLog events={filtered} maxItems={100} />
        </div>
    );
}
