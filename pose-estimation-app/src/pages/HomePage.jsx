import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const HomePage = ({ onStartSession, onStartSet, onBuildSet, onLogout, onSessionHistory, onLeaderboard, onUploadVideo, onProfile }) => {
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            onLogout();
        }
    }, [isAuthenticated, onLogout]);

    if (!isAuthenticated) return null;

    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    return (
        <div className="ya-page">
            <div className="ya-shell">
                {/* TOP BAR */}
                <header className="ya-topbar">
                    <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', color: 'var(--ya-forest)' }}>
                        <svg viewBox="0 0 58 55" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                            <path d="M36.6979 1C31.6979 1 28.6979 12.5 28.6979 12.5C28.6979 12.5 -4.14854 10.7492 1.6979 20C6.158 27.0572 22.6979 24 22.6979 24L23.1979 31.5C23.1979 31.5 4.1979 46.5 9.6979 52.5C15.1979 58.5 34.6979 31.5 41.6979 33.5C48.6979 35.5 41.6287 52.9588 53.1979 51C53.1979 51 54.8762 38.5502 51.6979 34.5C48.5195 30.4498 45.8735 29.0462 40.6979 27V21.5C40.6979 21.5 51.6979 21.5 56.1979 18.5C60.6979 15.5 41.6979 10.5 41.6979 10.5C41.6979 10.5 41.6979 1 36.6979 1Z" />
                        </svg>
                    </div>
                    <nav className="ya-topnav">
                        <button title="Help">
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></svg>
                        </button>
                        <button title="Profile" onClick={onProfile}>
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
                        </button>
                        <button title="Sign out" onClick={onLogout}>
                            <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>
                        </button>
                    </nav>
                </header>

                {/* TITLE BLOCK */}
                <section className="ya-title-block">
                    <div>
                        <h1>Yoga Pose Tracker</h1>
                        <p className="ya-sub">Perfect your practice with AI-powered pose detection and real-time feedback.</p>
                    </div>
                    <div className="ya-meta">
                        <div><b>{dayName}</b>, {dateStr}</div>
                    </div>
                </section>

                {/* BENTO GRID */}
                <section className="ya-bento">
                    {/* Hero: Start Set */}
                    <div className="ya-card hero" onClick={onStartSet} role="button" tabIndex={0} aria-label="Start a curated set">
                        <div className="ya-photo" />
                        <div className="ya-body">
                            <div>
                                <h2>Start <em>Set</em></h2>
                                <p className="ya-desc">Practice a curated sequence of yoga poses.</p>
                                <span className="ya-cta">
                                    Begin practice
                                    <span className="arr" aria-hidden="true">
                                        <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Build Set */}
                    <div className="ya-card build" onClick={onBuildSet} role="button" tabIndex={0} aria-label="Build your own set">
                        <span className="ya-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg>
                        </span>
                        <div>
                            <h2>Build <em>Set</em></h2>
                            <p className="ya-desc">Create your own sequence of poses.</p>
                        </div>
                        <div className="ya-footer">
                            <span className="ya-pill">
                                Compose
                                <span className="arr" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* Session History */}
                    <div className="ya-card small" onClick={onSessionHistory} role="button" tabIndex={0} aria-label="Session history">
                        <span className="ya-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v5l3 2"/></svg>
                        </span>
                        <div className="ya-text">
                            <h3>Session History</h3>
                            <p className="ya-desc">View your past sessions and progress.</p>
                        </div>
                        <span className="ya-chev" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
                        </span>
                    </div>

                    {/* Upload Video */}
                    <div className="ya-card small" onClick={onUploadVideo} role="button" tabIndex={0} aria-label="Upload video">
                        <span className="ya-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v13"/></svg>
                        </span>
                        <div className="ya-text">
                            <h3>Upload Video</h3>
                            <p className="ya-desc">Score your yoga pose from a recorded video.</p>
                        </div>
                        <span className="ya-chev" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
                        </span>
                    </div>

                    {/* Leaderboard */}
                    <div className="ya-card small" onClick={onLeaderboard} role="button" tabIndex={0} aria-label="Leaderboard">
                        <span className="ya-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" style={{ width: 32, height: 32 }}><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5v2a3 3 0 0 0 3 3"/><path d="M16 6h3v2a3 3 0 0 1-3 3"/><path d="M10 13h4v3h-4z"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>
                        </span>
                        <div className="ya-text">
                            <h3>Leaderboard</h3>
                            <p className="ya-desc">Check ranking of everyone's score.</p>
                        </div>
                        <span className="ya-chev" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
                        </span>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default HomePage;
