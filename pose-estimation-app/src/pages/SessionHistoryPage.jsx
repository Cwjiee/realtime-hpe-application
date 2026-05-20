import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const SessionHistoryPage = ({ onHomeClick, onSessionSelect }) => {
    const { token } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSessions = async () => {
            setLoading(true); setError(null);
            try {
                const res = await fetch(`${API_BASE}/api/sessions`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) throw new Error(`Server error: ${res.status}`);
                const data = await res.json();
                setSessions(data.sessions);
            } catch (err) {
                console.error('Failed to fetch sessions:', err);
                setError('Could not load session history. Is the backend running?');
            }
            setLoading(false);
        };
        fetchSessions();
    }, []);

    const getScoreTag = (score) => {
        if (score >= 80) return { bg: 'rgba(110,118,87,0.12)', color: 'var(--ya-ok)', text: 'Great' };
        if (score >= 50) return { bg: 'rgba(168,120,46,0.10)', color: 'var(--ya-warn)', text: 'Good' };
        return { bg: 'rgba(142,58,24,0.08)', color: 'var(--ya-fix)', text: 'Needs work' };
    };

    const avgScore = sessions.length > 0 
        ? (sessions.reduce((acc, s) => acc + (s.overall_avg_score || 0), 0) / sessions.length).toFixed(1)
        : 0;

    const streak = React.useMemo(() => {
        if (!sessions || sessions.length === 0) return 0;
        const sorted = [...sessions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const dates = [...new Set(sorted.map(s => {
            const d = new Date(s.created_at);
            return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        }))];
        let currentStreak = 0;
        const todayTime = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
        if (dates[0] !== todayTime && dates[0] !== todayTime - 86400000) return 0;
        let expectedDate = dates[0];
        for (const time of dates) {
            if (time === expectedDate) {
                currentStreak++;
                expectedDate -= 86400000;
            } else {
                break;
            }
        }
        return currentStreak;
    }, [sessions]);

    return (
        <div className="ya-page" style={{ overflow: 'hidden' }}>
            <div className="ya-shell-flex">
                {/* Top bar */}
                <header style={{ display: 'flex', alignItems: 'center' }}>
                    <button className="ya-home-link" onClick={onHomeClick}>
                        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>Home
                    </button>
                </header>

                {/* Page head */}
                <section className="ya-page-head" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: 24, paddingBottom: 18, borderBottom: '1px solid var(--ya-rule)' }}>
                    <div>
                        <h1 style={{ fontFamily: 'var(--ya-serif)', fontSize: 44, fontWeight: 400, letterSpacing: '-0.014em', lineHeight: 1.0, margin: '0 0 8px', color: 'var(--ya-ink)' }}>Session <em>history</em></h1>
                        <p className="ya-sub" style={{ fontSize: 13, color: 'var(--ya-ink-soft)', margin: 0 }}>Track your progress and review past sessions.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignSelf: 'end' }}>
                        <div style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 14, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110 }}>
                            <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)' }}>Total</span>
                            <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1.1, color: 'var(--ya-ink)', fontVariantNumeric: 'tabular-nums' }}>
                                {sessions.length} <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>sessions</em>
                            </span>
                        </div>
                        <div style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 14, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110 }}>
                            <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)' }}>Avg score</span>
                            <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1.1, color: 'var(--ya-ink)', fontVariantNumeric: 'tabular-nums' }}>
                                {avgScore}%
                            </span>
                        </div>
                        <div style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 14, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110 }}>
                            <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)' }}>Streak</span>
                            <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1.1, color: 'var(--ya-ink)', fontVariantNumeric: 'tabular-nums' }}>
                                {streak} <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>days</em>
                            </span>
                        </div>
                    </div>
                </section>

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
                        <div style={{ width: 32, height: 32, border: '3px solid var(--ya-rule)', borderTopColor: 'var(--ya-forest)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <p style={{ color: 'var(--ya-muted)', fontSize: 14 }}>Loading sessions...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {/* Error */}
                {error && !loading && <div className="ya-auth-error">{error}</div>}

                {/* Empty */}
                {!loading && !error && sessions.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, textAlign: 'center' }}>
                        <p style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, color: 'var(--ya-ink)' }}>No sessions yet</p>
                        <p style={{ color: 'var(--ya-muted)', fontSize: 14 }}>Complete a Pose Set to see your history here.</p>
                        <button onClick={onHomeClick} className="ya-auth-btn" style={{ width: 'auto', padding: '12px 28px', fontSize: 13 }}>Start a Session</button>
                    </div>
                )}

                {/* List */}
                {!loading && !error && sessions.length > 0 && (
                    <section style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '2px 4px 16px 2px' }}>
                        {sessions.map((session) => {
                            const scoreTag = getScoreTag(session.overall_avg_score);
                            return (
                                <article
                                    key={session.session_id}
                                    onClick={() => onSessionSelect?.(session.session_id)}
                                    style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 18, background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 16, padding: '18px 20px', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s, border-color .2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = 'var(--ya-camel)'; e.currentTarget.style.boxShadow = '0 12px 30px -22px rgba(47,55,39,0.25)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--ya-rule)'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    {/* Info */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                            <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 12, fontStyle: 'italic', letterSpacing: '0.03em', padding: '3px 10px', borderRadius: 999, background: session.status === 'completed' ? 'rgba(110,118,87,0.12)' : 'rgba(168,120,46,0.12)', color: session.status === 'completed' ? 'var(--ya-ok)' : 'var(--ya-warn)' }}>
                                                {session.status === 'completed' ? 'Completed' : 'In Progress'}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--ya-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' }}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                                {formatDate(session.created_at)}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--ya-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' }}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l2.5 2.5"/></svg>
                                                {formatTime(session.created_at)}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--ya-muted)' }}>{session.total_poses} poses</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                            {session.poses.length > 0 ? session.poses.map((p, i) => (
                                                <span key={i} style={{ fontSize: 11, fontWeight: 500, color: 'var(--ya-forest)', background: 'rgba(110,118,87,0.13)', border: '1px solid rgba(110,118,87,0.2)', padding: '3px 9px', borderRadius: 999 }}>{p}</span>
                                            )) : <span style={{ fontSize: 11, color: 'var(--ya-muted)', fontStyle: 'italic' }}>No poses recorded</span>}
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ya-muted)', marginBottom: 4 }}>Score</div>
                                        <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 28, fontWeight: 400, color: 'var(--ya-ink)', fontVariantNumeric: 'tabular-nums' }}>
                                            {session.total_poses > 0 ? `${session.overall_avg_score}%` : '—'}
                                        </span>
                                    </div>

                                    {/* Chevron */}
                                    <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--ya-muted)' }}>
                                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M9 6l6 6-6 6"/></svg>
                                    </span>
                                </article>
                            );
                        })}
                    </section>
                )}
            </div>
        </div>
    );
};

export default SessionHistoryPage;
