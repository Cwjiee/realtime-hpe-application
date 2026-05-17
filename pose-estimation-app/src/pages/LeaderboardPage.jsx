import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

const LeaderboardPage = ({ onHomeClick }) => {
    const [selectedPose, setSelectedPose] = useState('all');
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useAuth();

    const currentUserId = (() => {
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub || null;
        } catch {
            return null;
        }
    })();

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            setError(null);
            try {
                const poseParam = selectedPose !== 'all' ? `?pose=${selectedPose}` : '';
                const res = await fetch(`${API_BASE}/api/leaderboard${poseParam}`);
                if (!res.ok) throw new Error(`Server error: ${res.status}`);
                const data = await res.json();
                setRankings(data.rankings);
            } catch (err) {
                console.error('Failed to fetch leaderboard:', err);
                setError('Could not load leaderboard. Is the backend running?');
            }
            setLoading(false);
        };
        fetchLeaderboard();
    }, [selectedPose]);

    const filters = [
        { value: 'all', label: 'Overall' },
        { value: 'warrior1', label: 'Warrior I' },
        { value: 'warrior2', label: 'Warrior II' },
        { value: 'tree', label: 'Tree' },
        { value: 'triangle', label: 'Triangle' },
    ];

    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);
    // Reorder podium: [2nd, 1st, 3rd]
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

    return (
        <div className="ya-page" style={{ overflow: 'hidden' }}>
            <div className="ya-shell-flex">
                {/* Top bar */}
                <header style={{ display: 'flex', alignItems: 'center' }}>
                    <button className="ya-home-link" onClick={onHomeClick}>
                        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                        Home
                    </button>
                </header>

                {/* Page head */}
                <section className="ya-page-head">
                    <div>
                        <h1>Leader<em>board</em></h1>
                        <p className="ya-sub">See who's mastering the poses.</p>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 999, padding: 4 }} role="tablist">
                        {filters.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setSelectedPose(f.value)}
                                style={{
                                    font: 'inherit', fontSize: 12, fontWeight: selectedPose === f.value ? 600 : 500,
                                    color: selectedPose === f.value ? 'var(--ya-paper-2)' : 'var(--ya-ink-soft)',
                                    background: selectedPose === f.value ? 'var(--ya-forest)' : 'transparent',
                                    border: 0, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', letterSpacing: '0.02em',
                                    transition: 'background .15s, color .15s',
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
                        <div style={{ width: 32, height: 32, border: '3px solid var(--ya-rule)', borderTopColor: 'var(--ya-forest)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <p style={{ color: 'var(--ya-muted)', fontSize: 14 }}>Loading leaderboard...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="ya-auth-error">{error}</div>
                )}

                {/* Empty */}
                {!loading && !error && rankings.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, textAlign: 'center' }}>
                        <p style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, color: 'var(--ya-ink)' }}>No rankings yet</p>
                        <p style={{ color: 'var(--ya-muted)', fontSize: 14 }}>Complete a session to appear on the leaderboard.</p>
                    </div>
                )}

                {/* Rankings */}
                {!loading && !error && rankings.length > 0 && (
                    <main style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateRows: 'auto 1fr', gap: 18 }}>
                        {/* Podium */}
                        {top3.length >= 3 && (
                            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 16, alignItems: 'end' }}>
                                {podiumOrder.map((user, i) => {
                                    const isFirst = user.rank === 1;
                                    const isCurrentUser = currentUserId && user.user_id === currentUserId;
                                    const rankLabel = user.rank === 1 ? 'Champion' : user.rank === 2 ? 'Second' : 'Third';
                                    return (
                                        <article key={user.user_id} style={{
                                            background: isFirst ? 'linear-gradient(165deg, var(--ya-forest) 0%, var(--ya-forest-deep) 100%)' : 'var(--ya-paper-2)',
                                            color: isFirst ? 'var(--ya-paper-2)' : 'var(--ya-ink)',
                                            border: `1px solid ${isFirst ? 'var(--ya-forest-deep)' : 'var(--ya-rule)'}`,
                                            borderRadius: 18, padding: isFirst ? '28px 22px 24px' : '22px 22px 20px',
                                            display: 'flex', flexDirection: 'column', gap: 12,
                                            boxShadow: isFirst ? '0 24px 50px -28px rgba(47,55,39,0.55)' : 'none',
                                        }}>
                                            {/* Rank */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 600, color: isFirst ? 'rgba(236,226,200,0.65)' : 'var(--ya-muted)' }}>
                                                    <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 28, fontStyle: 'italic', fontWeight: 400, letterSpacing: 0, lineHeight: 0.9, color: isFirst ? 'var(--ya-paper-2)' : user.rank === 2 ? 'var(--ya-silver)' : 'var(--ya-bronze)' }}>{user.rank}</span>
                                                    <span>{rankLabel}</span>
                                                </div>
                                            </div>
                                            {/* User */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                <span style={{
                                                    width: 48, height: 48, borderRadius: '50%',
                                                    background: isFirst ? 'rgba(236,226,200,0.16)' : 'var(--ya-paper)',
                                                    border: `1px solid ${isFirst ? 'rgba(236,226,200,0.28)' : 'var(--ya-rule)'}`,
                                                    display: 'grid', placeItems: 'center', fontFamily: 'var(--ya-serif)',
                                                    fontSize: 18, fontStyle: 'italic', color: isFirst ? 'var(--ya-paper-2)' : 'var(--ya-brown-2)', flexShrink: 0,
                                                }}>{user.avatar}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1.25, margin: 0, color: isFirst ? 'var(--ya-paper-2)' : 'var(--ya-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        {user.name}
                                                        {isCurrentUser && (
                                                            <span style={{ fontFamily: 'var(--ya-sans)', fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', background: isFirst ? 'rgba(201,204,174,0.95)' : 'var(--ya-pale-sage)', color: isFirst ? 'var(--ya-forest-deep)' : 'var(--ya-forest)', padding: '3px 8px', borderRadius: 999 }}>You</span>
                                                        )}
                                                    </p>
                                                    <p style={{ fontSize: 11, color: isFirst ? 'rgba(236,226,200,0.65)' : 'var(--ya-muted)', margin: '2px 0 0' }}>{user.total_sessions} sessions</p>
                                                </div>
                                            </div>
                                            {/* Score */}
                                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingTop: 10, borderTop: `1px solid ${isFirst ? 'rgba(236,226,200,0.18)' : 'var(--ya-rule)'}` }}>
                                                <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: isFirst ? 'rgba(236,226,200,0.62)' : 'var(--ya-muted)' }}>Score</span>
                                                <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1, color: isFirst ? 'var(--ya-paper-2)' : 'var(--ya-ink)', fontVariantNumeric: 'tabular-nums' }}>{user.score}%</span>
                                            </div>
                                        </article>
                                    );
                                })}
                            </section>
                        )}

                        {/* Table */}
                        {rest.length > 0 && (
                            <section style={{ flex: 1, minHeight: 0, background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 140px 140px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--ya-rule)', background: 'var(--ya-paper-3)' }}>
                                    <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)', fontWeight: 600 }}>Rank</span>
                                    <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)', fontWeight: 600 }}>User</span>
                                    <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)', fontWeight: 600, textAlign: 'right' }}>Sessions</span>
                                    <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)', fontWeight: 600, textAlign: 'right' }}>Score</span>
                                </div>
                                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                    {rest.map(user => {
                                        const isCurrentUser = currentUserId && user.user_id === currentUserId;
                                        return (
                                            <div key={user.user_id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 140px 140px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(196,182,147,0.45)', cursor: 'pointer', transition: 'background .15s' }}>
                                                <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: 'var(--ya-ink-soft)' }}>{user.rank}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ya-paper)', border: '1px solid var(--ya-rule)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ya-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ya-brown-2)', flexShrink: 0 }}>{user.avatar}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ya-ink)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                        {user.name}
                                                        {isCurrentUser && (
                                                            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', background: 'var(--ya-pale-sage)', color: 'var(--ya-forest)', padding: '2px 7px', borderRadius: 999 }}>You</span>
                                                        )}
                                                    </span>
                                                </span>
                                                <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--ya-ink-soft)', fontVariantNumeric: 'tabular-nums' }}><b style={{ color: 'var(--ya-ink)', fontWeight: 600 }}>{user.total_sessions}</b></span>
                                                <span style={{ textAlign: 'right', fontFamily: 'var(--ya-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ya-ink)', fontVariantNumeric: 'tabular-nums' }}>{user.score}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </main>
                )}
            </div>
        </div>
    );
};

export default LeaderboardPage;
