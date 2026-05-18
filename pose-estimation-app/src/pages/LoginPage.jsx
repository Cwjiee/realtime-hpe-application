import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const LoginPage = ({ onLogin, onNeedAccount, onBackToLanding }) => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString()
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || 'Failed to login');
            }

            login(data.access_token);
            onLogin();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ya-auth-page">
            <div className="ya-auth-app">
                {/* LEFT: image */}
                <section className="ya-auth-image">
                    <div className="ya-auth-photo" />
                </section>

                {/* RIGHT: form */}
                <section className="ya-auth-form-pane">
                    <header style={{ marginBottom: 20 }}>
                        <button onClick={onBackToLanding} className="ya-home-link" style={{ marginLeft: -10 }}>
                            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M15 18l-6-6 6-6"/></svg>
                            Back
                        </button>
                    </header>
                    <div className="ya-auth-form-shell">
                        <form className="ya-auth-form" onSubmit={handleSubmit} autoComplete="on" noValidate>
                            <h1 className="ya-auth-h1">Welcome <em>back</em></h1>
                            <p className="ya-auth-sub">Sign in to continue your journey.</p>

                            {error && <div className="ya-auth-error">{error}</div>}

                            <div className="ya-field">
                                <label htmlFor="email">Email</label>
                                <div className="ya-row">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="ya-field">
                                <label htmlFor="password">Password</label>
                                <div className="ya-row">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPw ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        aria-label={showPw ? 'Hide password' : 'Show password'}
                                        style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 999, color: 'var(--ya-muted)', cursor: 'pointer', background: 'transparent', border: 0 }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="ya-auth-meta">
                                <span style={{ color: 'var(--ya-ink-soft)', fontSize: 13 }}>Remember me</span>
                                <button type="button" className="ya-auth-link">Forgot password?</button>
                            </div>

                            <button className="ya-auth-btn" type="submit" disabled={loading}>
                                <span>{loading ? 'Centering…' : 'Sign In'}</span>
                                {!loading && <span className="arr">→</span>}
                            </button>

                            <p className="ya-auth-signup-row">
                                Don't have an account?{' '}
                                <button type="button" className="ya-auth-link" onClick={onNeedAccount}>Sign up</button>
                            </p>
                        </form>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default LoginPage;
