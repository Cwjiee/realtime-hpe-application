import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatTime = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const SessionDetailPage = ({ sessionId, onBackClick, onHomeClick }) => {
    const { token } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!sessionId) return;
        const fetchAnalytics = async () => {
            setLoading(true); setError(null);
            try {
                const res = await fetch(`${API_BASE}/api/session/${sessionId}/analytics`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) throw new Error(`Server error: ${res.status}`);
                const data = await res.json();
                setAnalytics(data);
            } catch (err) {
                console.error('Failed to fetch session analytics:', err);
                setError('Could not load session details.');
            }
            setLoading(false);
        };
        fetchAnalytics();
    }, [sessionId]);

    const getScoreColor = (s) => s >= 80 ? 'var(--ya-ok)' : s >= 50 ? 'var(--ya-warn)' : 'var(--ya-fix)';
    const getScoreBg = (s) => s >= 80 ? 'rgba(110,118,87,0.2)' : s >= 50 ? 'rgba(168,120,46,0.18)' : 'rgba(142,58,24,0.15)';

    return (
        <div className="ya-page" style={{ overflow: 'hidden' }}>
            <div className="ya-shell-flex">
                {/* Top bar */}
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button className="ya-home-link" onClick={onBackClick}>
                        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>History
                    </button>
                    <button className="ya-home-link" onClick={onHomeClick}>
                        <svg viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>
                        Home
                    </button>
                </header>

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
                        <div style={{ width: 32, height: 32, border: '3px solid var(--ya-rule)', borderTopColor: 'var(--ya-forest)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <p style={{ color: 'var(--ya-muted)', fontSize: 14 }}>Loading session details...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {/* Error */}
                {error && !loading && <div className="ya-auth-error">{error}</div>}

                {/* Content */}
                {analytics && !loading && (
                    <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
                        {/* Session header card */}
                        <section style={{ background: 'linear-gradient(165deg, var(--ya-forest) 0%, var(--ya-forest-deep) 100%)', borderRadius: 18, padding: '28px 30px', color: 'var(--ya-paper-2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: 'var(--ya-pale-sage)', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
                                <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400 }}>Completed Session</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 13, color: 'rgba(236,226,200,0.7)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' }}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                    {formatDate(analytics.created_at)}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' }}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l2.5 2.5"/></svg>
                                    {formatTime(analytics.created_at)}
                                </span>
                            </div>
                        </section>

                        {/* Overall score */}
                        <section style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 18, padding: '24px 28px' }}>
                            <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)', marginBottom: 8 }}>Overall Average Score</div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 14 }}>
                                <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 56, fontWeight: 400, lineHeight: 0.9, color: 'var(--ya-ink)', fontVariantNumeric: 'tabular-nums' }}>
                                    {analytics.overall_avg_score.toFixed(1)}%
                                </span>
                                <span style={{ fontSize: 13, color: 'var(--ya-muted)', marginBottom: 6 }}>across {analytics.total_poses} pose{analytics.total_poses !== 1 ? 's' : ''}</span>
                            </div>
                            <div style={{ width: '100%', height: 8, background: 'rgba(196,182,147,0.35)', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 99, background: getScoreColor(analytics.overall_avg_score), width: `${Math.min(analytics.overall_avg_score, 100)}%`, transition: 'width 1s ease-out' }} />
                            </div>
                        </section>

                        {/* Best & Worst */}
                        {analytics.total_poses > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                {analytics.best_pose && (
                                    <article style={{ background: 'var(--ya-paper-2)', border: '1px solid rgba(110,118,87,0.25)', borderRadius: 16, padding: '18px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ya-ok)', marginBottom: 8 }}>
                                            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M22 7l-10 10-4-4"/><path d="M16 7l-4 4"/></svg>
                                            <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Best Pose</span>
                                        </div>
                                        <p style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 4px', color: 'var(--ya-ink)' }}>{analytics.best_pose.name}</p>
                                        <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 30, fontWeight: 400, color: 'var(--ya-ok)' }}>{analytics.best_pose.avg_score.toFixed(1)}%</span>
                                    </article>
                                )}
                                {analytics.worst_pose && (
                                    <article style={{ background: 'var(--ya-paper-2)', border: '1px solid rgba(168,120,46,0.25)', borderRadius: 16, padding: '18px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ya-warn)', marginBottom: 8 }}>
                                            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 5v9"/><circle cx="12" cy="18" r="0.6" fill="currentColor"/></svg>
                                            <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Needs Improvement</span>
                                        </div>
                                        <p style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 4px', color: 'var(--ya-ink)' }}>{analytics.worst_pose.name}</p>
                                        <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 30, fontWeight: 400, color: 'var(--ya-warn)' }}>{analytics.worst_pose.avg_score.toFixed(1)}%</span>
                                    </article>
                                )}
                            </div>
                        )}

                        {/* Pose breakdown */}
                        <section style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 18, padding: '24px 28px' }}>
                            <h3 style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 16px', color: 'var(--ya-ink)' }}>Pose <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>breakdown</em></h3>
                            {analytics.poses.length === 0 ? (
                                <p style={{ fontSize: 13, color: 'var(--ya-muted)', fontStyle: 'italic' }}>No pose data available.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {analytics.poses.map((pose, i) => (
                                        <article key={i} style={{ background: 'var(--ya-paper-3)', border: '1px solid var(--ya-rule)', borderRadius: 14, padding: '16px 18px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 18, fontWeight: 400, color: 'var(--ya-ink)' }}>{pose.label}</span>
                                                <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, color: getScoreColor(pose.avg_score) }}>{pose.avg_score.toFixed(1)}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: 6, background: 'rgba(196,182,147,0.35)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                                                <div style={{ height: '100%', borderRadius: 99, background: getScoreBg(pose.avg_score), width: `${Math.min(pose.avg_score, 100)}%`, transition: 'width 0.7s ease-out' }} />
                                            </div>
                                            <div style={{ display: 'flex', gap: 18, fontSize: 11, color: 'var(--ya-muted)' }}>
                                                <span>Max: <b style={{ color: 'var(--ya-ink-soft)', fontWeight: 600 }}>{pose.max_score.toFixed(1)}%</b></span>
                                                <span>Min: <b style={{ color: 'var(--ya-ink-soft)', fontWeight: 600 }}>{pose.min_score.toFixed(1)}%</b></span>
                                                <span>Frames: <b style={{ color: 'var(--ya-ink-soft)', fontWeight: 600 }}>{pose.total_frames}</b></span>
                                            </div>
                                            {/* Feedback tips */}
                                            {pose.feedback && pose.feedback.length > 0 && (
                                                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--ya-rule)' }}>
                                                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                        {pose.feedback.map((tip, tipIdx) => (
                                                            <li key={tipIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                                                                <span style={{ width: 5, height: 5, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: tip.startsWith('Great') ? 'var(--ya-ok)' : 'var(--ya-warn)' }} />
                                                                <span style={{ color: 'var(--ya-ink-soft)' }}>{tip}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Trophy footer */}
                        {analytics.overall_avg_score >= 80 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 }}>
                                <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: 'var(--ya-gold)', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5v2a3 3 0 0 0 3 3"/><path d="M16 6h3v2a3 3 0 0 1-3 3"/><path d="M10 13h4v3h-4z"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>
                                <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 16, fontStyle: 'italic', color: 'var(--ya-ink-soft)' }}>Great session! Keep it up.</span>
                            </div>
                        )}
                    </main>
                )}
            </div>
        </div>
    );
};

export default SessionDetailPage;
