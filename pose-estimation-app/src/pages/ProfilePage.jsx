import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const ProfilePage = ({ onHomeClick }) => {
    const { token } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) return;
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/api/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Failed to load profile');
                const data = await res.json();
                setProfile(data);
            } catch (err) {
                console.error('Profile fetch error:', err);
                setError(err.message);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [token]);

    const getScoreColor = (score) => {
        if (score >= 80) return 'var(--ya-ok)';
        if (score >= 50) return 'var(--ya-warn)';
        return 'var(--ya-fix)';
    };

    const getScoreBg = (score) => {
        if (score >= 80) return 'rgba(110,118,87,0.2)';
        if (score >= 50) return 'rgba(168,120,46,0.18)';
        return 'rgba(142,58,24,0.15)';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    };

    const formatRelativeDate = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateStr);
    };

    return (
        <div className="ya-page" style={{ overflow: 'auto' }}>
            <div className="ya-shell" style={{ maxWidth: 900 }}>
                {/* Header */}
                <header style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                    <button onClick={onHomeClick} className="ya-home-link">
                        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                        Home
                    </button>
                </header>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
                            <div className="ya-spinner" style={{ width: 36, height: 36 }} />
                            <p style={{ color: 'var(--ya-muted)', fontSize: 14 }}>Loading your profile…</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-fix)', color: 'var(--ya-fix)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    {profile && !loading && (
                        <>
                            {/* Title Block (replacing the old header/banner) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'end', marginBottom: 28, paddingBottom: 22, borderBottom: '1px solid var(--ya-rule)' }}>
                                <div>
                                    <h1 style={{ fontFamily: 'var(--ya-serif)', fontSize: 'clamp(40px, 4.6vw, 64px)', fontWeight: 400, letterSpacing: '-0.014em', lineHeight: 1.0, margin: '0 0 12px', color: 'var(--ya-ink)', textWrap: 'balance' }}>My <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>Profile</em></h1>
                                    <div style={{ fontSize: 13, color: 'var(--ya-ink-soft)', margin: 0 }}>Joined {formatDate(profile.joined_at)}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span style={{ fontSize: 20, fontFamily: 'var(--ya-serif)', color: 'var(--ya-ink)' }}>{profile.name}</span>
                                        <span style={{ fontSize: 13, color: 'var(--ya-muted)' }}>{profile.email}</span>
                                    </div>
                                    <div style={{ width: 64, height: 64, background: 'var(--ya-forest)', color: 'var(--ya-paper-2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 500, fontFamily: 'var(--ya-serif)' }}>
                                        {profile.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                <article className="ya-card small">
                                    <div className="ya-head">Total Sessions</div>
                                    <div className="ya-body" style={{ alignItems: 'flex-start' }}>
                                        <div style={{ fontFamily: 'var(--ya-serif)', fontSize: 36, color: 'var(--ya-ink)', lineHeight: 1 }}>{profile.total_sessions}</div>
                                    </div>
                                </article>
                                <article className="ya-card small">
                                    <div className="ya-head">Completed</div>
                                    <div className="ya-body" style={{ alignItems: 'flex-start' }}>
                                        <div style={{ fontFamily: 'var(--ya-serif)', fontSize: 36, color: 'var(--ya-ok)', lineHeight: 1 }}>{profile.completed_sessions}</div>
                                    </div>
                                </article>
                                <article className="ya-card small">
                                    <div className="ya-head">Poses Practiced</div>
                                    <div className="ya-body" style={{ alignItems: 'flex-start' }}>
                                        <div style={{ fontFamily: 'var(--ya-serif)', fontSize: 36, color: 'var(--ya-brown-2)', lineHeight: 1 }}>{profile.total_poses_practiced}</div>
                                    </div>
                                </article>
                                <article className="ya-card small">
                                    <div className="ya-head">Custom Sets</div>
                                    <div className="ya-body" style={{ alignItems: 'flex-start' }}>
                                        <div style={{ fontFamily: 'var(--ya-serif)', fontSize: 36, color: 'var(--ya-camel)', lineHeight: 1 }}>{profile.custom_sets_count}</div>
                                    </div>
                                </article>
                            </div>

                            {/* Overall Average Score */}
                            <section style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 18, padding: '24px 28px' }}>
                                <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)', marginBottom: 8 }}>Overall Average Score</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 14 }}>
                                    <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 56, fontWeight: 400, lineHeight: 0.9, color: getScoreColor(profile.overall_avg_score) }}>
                                        {profile.overall_avg_score > 0 ? `${profile.overall_avg_score}%` : '—'}
                                    </span>
                                    <span style={{ fontSize: 13, color: 'var(--ya-muted)', marginBottom: 6 }}>
                                        across {profile.completed_sessions} completed sessions
                                    </span>
                                </div>
                                {profile.overall_avg_score > 0 && (
                                    <div style={{ width: '100%', height: 8, background: 'rgba(196,182,147,0.35)', borderRadius: 99, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', borderRadius: 99, background: getScoreColor(profile.overall_avg_score), width: `${Math.min(profile.overall_avg_score, 100)}%`, transition: 'width 1s ease-out' }} />
                                    </div>
                                )}
                            </section>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16 }}>
                                {/* Per-Pose Performance */}
                                {profile.per_pose_stats && profile.per_pose_stats.length > 0 && (
                                    <section style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 18, padding: '24px 28px' }}>
                                        <h3 style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 16px', color: 'var(--ya-ink)' }}>Pose <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>performance</em></h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            {profile.per_pose_stats.map((pose, idx) => (
                                                <article key={idx} style={{ background: 'var(--ya-paper-3)', border: '1px solid var(--ya-rule)', borderRadius: 14, padding: '16px 18px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                        <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 18, color: 'var(--ya-ink)' }}>{pose.label}</span>
                                                        <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, color: getScoreColor(pose.best_score) }}>{pose.best_score}%</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: 6, background: 'rgba(196,182,147,0.35)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                                                        <div style={{ height: '100%', borderRadius: 99, background: getScoreBg(pose.best_score), width: `${Math.min(pose.best_score, 100)}%`, transition: 'width 0.7s ease-out' }} />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 18, fontSize: 11, color: 'var(--ya-muted)' }}>
                                                        <span>Attempts: <b style={{ color: 'var(--ya-ink-soft)', fontWeight: 600 }}>{pose.attempts}</b></span>
                                                        <span>Avg: <b style={{ color: 'var(--ya-ink-soft)', fontWeight: 600 }}>{pose.avg_score}%</b></span>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Recent Sessions */}
                                {profile.recent_sessions && profile.recent_sessions.length > 0 && (
                                    <section style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 18, padding: '24px 28px' }}>
                                        <h3 style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 16px', color: 'var(--ya-ink)' }}>Recent <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>sessions</em></h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {profile.recent_sessions.map((session, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--ya-paper-3)', borderRadius: 14, padding: '14px 18px', border: '1px solid var(--ya-rule)' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: session.status === 'completed' ? 'var(--ya-ok)' : 'var(--ya-warn)' }} />
                                                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ya-ink)' }}>
                                                                {session.total_poses} pose{session.total_poses !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--ya-muted)' }}>{formatRelativeDate(session.created_at)}</div>
                                                    </div>
                                                    <div style={{ fontFamily: 'var(--ya-serif)', fontSize: 20, color: getScoreColor(session.overall_avg_score) }}>
                                                        {session.overall_avg_score > 0 ? `${session.overall_avg_score}%` : '—'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>

                            {/* Empty state if no data */}
                            {profile.total_sessions === 0 && (
                                <div style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 18, padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <h3 style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, color: 'var(--ya-ink)', margin: '0 0 8px' }}>No sessions <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>yet</em></h3>
                                    <p style={{ color: 'var(--ya-muted)', fontSize: 14, margin: '0 0 20px' }}>Start practicing to see your stats here!</p>
                                    <button onClick={onHomeClick} className="ya-btn">Start Practicing</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
