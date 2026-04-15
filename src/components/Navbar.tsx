'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

interface SimStatus {
    phase: string;
    tick: number;
}

interface User {
    id: number;
    email: string;
    name: string;
}

function formatTick(tick: number): string {
    const m = Math.floor(tick / 60);
    const s = tick % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [sim, setSim] = useState<SimStatus | null>(null);
    const [user, setUser] = useState<User | null>(null);

    const fetchSim = useCallback(async () => {
        try {
            const res = await fetch('/api/telemetry');
            if (res.ok) {
                const data = await res.json();
                if (data._simulator) setSim(data._simulator);
            }
        } catch { /* silent */ }
    }, []);

    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            }
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchSim();
        fetchUser();
        const interval = setInterval(fetchSim, 3000);
        return () => clearInterval(interval);
    }, [fetchSim, fetchUser]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const links = [
        { href: '/', label: 'Dashboard', icon: '◈' },
        { href: '/devices', label: 'Devices', icon: '⬡' },
        { href: '/analytics', label: 'Analytics', icon: '▲' },
        { href: '/events', label: 'Events', icon: '◉' },
        { href: '/sessions', label: 'Sessions', icon: '◷' },
        { href: '/settings', label: 'Settings', icon: '⚙' },
    ];

    const phase = sim?.phase ?? null;
    const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

    return (
        <nav className="navbar">
            <Link href="/" className="navbar-brand">
                <div className="logo-icon">⚡</div>
                <div>
                    <h1>Lum<span className="brand-highlight">ion</span></h1>
                    <span className="sub">Wireless Power Through Light</span>
                </div>
            </Link>

            <div className="navbar-links">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={pathname === link.href ? 'active' : ''}
                    >
                        <span style={{ fontSize: 10, marginRight: 5, opacity: 0.7 }}>{link.icon}</span>
                        {link.label}
                    </Link>
                ))}
            </div>

            <div className="navbar-status">
                <div className="pulse-dot" />
                {phase ? (
                    <>
                        <span className={`mono phase-${phase}`}>{phase.toUpperCase()}</span>
                        {sim && <span className="navbar-tick">{formatTick(sim.tick)}</span>}
                    </>
                ) : (
                    <span className="mono">SIM ACTIVE</span>
                )}

                {user && (
                    <div className="navbar-user" style={{ marginLeft: 16 }}>
                        <div className="user-avatar">{initials}</div>
                        <span className="user-name">{user.name}</span>
                        <button className="btn-logout" onClick={handleLogout}>Logout</button>
                    </div>
                )}
            </div>
        </nav>
    );
}
