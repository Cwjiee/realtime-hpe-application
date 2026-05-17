import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const SignupPage = ({ onSignup, onHaveAccount }) => {
    const { login } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || 'Failed to create account');
            }

            login(data.access_token);
            onSignup();
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
                    <div className="ya-auth-form-shell">
                        <form className="ya-auth-form" onSubmit={handleSubmit} autoComplete="on" noValidate>
                            <h1 className="ya-auth-h1">Create <em>account</em></h1>
                            <p className="ya-auth-sub">Join our community of yoga enthusiasts.</p>

                            {error && <div className="ya-auth-error">{error}</div>}

                            <div className="ya-field">
                                <label htmlFor="name">Full Name</label>
                                <div className="ya-row">
                                    <input id="name" type="text" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                            </div>

                            <div className="ya-field">
                                <label htmlFor="email">Email</label>
                                <div className="ya-row">
                                    <input id="email" type="email" placeholder="you@example.com" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                            </div>

                            <div className="ya-field">
                                <label htmlFor="password">Password</label>
                                <div className="ya-row">
                                    <input id="password" type="password" placeholder="Create a password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                            </div>

                            <div className="ya-field" style={{ marginBottom: 30 }}>
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <div className="ya-row">
                                    <input id="confirmPassword" type="password" placeholder="Confirm your password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                </div>
                            </div>

                            <button className="ya-auth-btn" type="submit" disabled={loading}>
                                <span>{loading ? 'Creating Account…' : 'Create Account'}</span>
                                {!loading && <span className="arr">→</span>}
                            </button>

                            <p className="ya-auth-signup-row">
                                Already have an account?{' '}
                                <button type="button" className="ya-auth-link" onClick={onHaveAccount}>Sign In</button>
                            </p>
                        </form>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SignupPage;
