'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [company, setCompany] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, company, inviteCode }),
            });

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || 'Registration failed');
            }
        } catch {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-layout">
            <div className="auth-card fade-in">
                <div className="logo-section">
                    <Image src="/lumion-logo.jpg" alt="Lumion" width={56} height={56} className="auth-logo" />
                    <h1>Lum<span>ion</span></h1>
                    <p>Request access to the dashboard</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="inviteCode">Invite Code</label>
                        <input
                            id="inviteCode"
                            type="text"
                            placeholder="Enter your invite code"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            required
                            autoFocus
                            autoComplete="off"
                            style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Contact your administrator for an invite code
                        </span>
                    </div>
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input id="name" type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="regEmail">Email</label>
                        <input id="regEmail" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="company">Company <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                        <input id="company" type="text" placeholder="Your organization" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="regPassword">Password</label>
                        <div className="password-wrapper">
                            <input
                                id="regPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Min. 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? '◉' : '◎'}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-link">
                    Already have an account? <a href="/login">Sign in</a>
                </div>
            </div>
        </div>
    );
}
