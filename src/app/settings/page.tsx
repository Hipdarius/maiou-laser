'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserInfo {
    id: number;
    email: string;
    name: string;
    company: string;
    created_at: string;
}

export default function SettingsPage() {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchUser = useCallback(async () => {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setName(data.user.name);
            setCompany(data.user.company || '');
        }
    }, []);

    useEffect(() => { fetchUser(); }, [fetchUser]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaved(false);
        await fetch('/api/auth/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, company }),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h2>Settings</h2>
                <p>Manage your account and preferences</p>
            </div>

            <div className="settings-grid">
                <div className="settings-section">
                    <h3>Account Information</h3>
                    <form className="auth-form" onSubmit={handleSave}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" value={user?.email ?? ''} disabled style={{ opacity: 0.5 }} />
                        </div>
                        <div className="form-group">
                            <label>Company</label>
                            <input
                                type="text"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder="Your organization"
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                <div className="settings-section">
                    <h3>System Information</h3>
                    <div className="settings-row">
                        <span className="settings-label">Platform</span>
                        <span className="settings-value">Lumion Dashboard v1.0</span>
                    </div>
                    <div className="settings-row">
                        <span className="settings-label">Account Created</span>
                        <span className="settings-value">{user ? new Date(user.created_at).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="settings-row">
                        <span className="settings-label">Hardware</span>
                        <span className="settings-value">ESP32 + IR LED Array</span>
                    </div>
                    <div className="settings-row">
                        <span className="settings-label">Transmitter</span>
                        <span className="settings-value">940 nm IR, Fresnel lens</span>
                    </div>
                    <div className="settings-row">
                        <span className="settings-label">Receiver</span>
                        <span className="settings-value">Silicon PV + DC-DC</span>
                    </div>
                    <div className="settings-row">
                        <span className="settings-label">Storage</span>
                        <span className="settings-value">10F Supercapacitor</span>
                    </div>
                    <div className="settings-row">
                        <span className="settings-label">Telemetry Rate</span>
                        <span className="settings-value">1 Hz</span>
                    </div>
                    <div className="settings-row">
                        <span className="settings-label">Database</span>
                        <span className="settings-value">SQLite (WAL)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
