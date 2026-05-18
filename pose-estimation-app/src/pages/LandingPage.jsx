import React from 'react';

const LandingPage = ({ onLoginClick, onSignupClick }) => {
    return (
        <div className="ya-page" style={{ overflowX: 'hidden' }}>
            <div className="ya-shell">
                {/* Navbar */}
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 60 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', color: 'var(--ya-forest)' }}>
                            <svg viewBox="0 0 58 55" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                <path d="M36.6979 1C31.6979 1 28.6979 12.5 28.6979 12.5C28.6979 12.5 -4.14854 10.7492 1.6979 20C6.158 27.0572 22.6979 24 22.6979 24L23.1979 31.5C23.1979 31.5 4.1979 46.5 9.6979 52.5C15.1979 58.5 34.6979 31.5 41.6979 33.5C48.6979 35.5 41.6287 52.9588 53.1979 51C53.1979 51 54.8762 38.5502 51.6979 34.5C48.5195 30.4498 45.8735 29.0462 40.6979 27V21.5C40.6979 21.5 51.6979 21.5 56.1979 18.5C60.6979 15.5 41.6979 10.5 41.6979 10.5C41.6979 10.5 41.6979 1 36.6979 1Z" />
                            </svg>
                        </div>
                        <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ya-ink)', letterSpacing: '-0.02em' }}>
                            Pose Tracker
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button 
                            onClick={onLoginClick} 
                            style={{ background: 'transparent', border: 'none', fontSize: 14, fontWeight: 500, color: 'var(--ya-ink)', cursor: 'pointer', padding: '10px 16px', borderRadius: 999 }}
                        >
                            Log in
                        </button>
                        <button 
                            onClick={onSignupClick} 
                            style={{ background: 'var(--ya-forest)', color: 'var(--ya-paper-2)', border: 'none', fontSize: 14, fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer', padding: '12px 24px', borderRadius: 999, transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 8px 24px -8px rgba(47,55,39,0.5)' }}
                        >
                            Sign up
                        </button>
                    </div>
                </header>

                {/* Hero Section */}
                <main style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'center', minHeight: '65vh', marginBottom: 60 }}>
                    <div style={{ paddingRight: 40 }}>
                        <h1 style={{ fontFamily: 'var(--ya-serif)', fontSize: 'clamp(48px, 6vw, 84px)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.0, color: 'var(--ya-ink)', marginBottom: 24, textWrap: 'balance' }}>
                            Master your flow.<br />
                            <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>Powered by AI.</em>
                        </h1>
                        <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--ya-ink-soft)', maxWidth: '42ch', margin: '0 0 40px' }}>
                            Elevate your yoga practice with real-time pose tracking, personalized guidance, and deep analytics. Practice with intention.
                        </p>
                        <button 
                            onClick={onSignupClick} 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--ya-ink)', color: 'var(--ya-paper)', border: 'none', fontSize: 16, fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer', padding: '16px 32px', borderRadius: 999, transition: 'all 0.2s' }}
                        >
                            Start Practicing Free
                            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                        </button>
                    </div>

                    <div style={{ position: 'relative', height: '100%', minHeight: 500 }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'url(/yoga-practice.png) center/cover', borderRadius: 24, filter: 'saturate(0.9) contrast(1.1)', boxShadow: '0 24px 64px -24px rgba(47,55,39,0.4)', zIndex: 2 }}>
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(43,38,30,0.1) 0%, rgba(43,38,30,0.3) 100%)', borderRadius: 24 }} />
                        </div>
                        {/* Decorative background blob */}
                        <div style={{ position: 'absolute', top: -30, right: -40, width: 400, height: 400, background: 'radial-gradient(circle, rgba(142,94,50,0.15) 0%, rgba(225,214,188,0) 70%)', zIndex: 1, borderRadius: '50%' }} />
                    </div>
                </main>

                {/* Features Bento */}
                <section className="ya-bento" style={{ marginBottom: 80 }}>
                    <div className="ya-card build" style={{ gridColumn: 'span 4', gridRow: 'span 2', padding: 32, background: 'var(--ya-paper-2)' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--ya-paper)', display: 'grid', placeItems: 'center', color: 'var(--ya-olive)', marginBottom: 24 }}>
                            <svg viewBox="0 0 24 24" style={{ width: 24, height: 24, stroke: 'currentColor', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                        <h3 style={{ fontFamily: 'var(--ya-serif)', fontSize: 28, fontWeight: 400, margin: '0 0 12px', color: 'var(--ya-ink)' }}>Real-time Form Feedback</h3>
                        <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ya-ink-soft)', margin: 0 }}>
                            Get precise angle calculations and verbal cues directly in your browser while you practice.
                        </p>
                    </div>

                    <div className="ya-card build" style={{ gridColumn: 'span 8', gridRow: 'span 2', padding: 32, background: 'linear-gradient(160deg, #cdd1b2 0%, #b8be9b 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h2 style={{ fontFamily: 'var(--ya-serif)', fontSize: 'clamp(32px, 3vw, 44px)', fontWeight: 400, margin: '0 0 16px', color: 'var(--ya-ink)', textWrap: 'balance' }}>
                            Build custom sequences tailored to <em style={{ fontStyle: 'italic', color: 'var(--ya-forest)' }}>your body.</em>
                        </h2>
                        <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--ya-forest-deep)', maxWidth: '48ch', margin: 0 }}>
                            Choose from dozens of meticulously tracked poses to create the ultimate flow for flexibility, strength, or relaxation.
                        </p>
                    </div>

                    <div className="ya-card small" style={{ gridColumn: 'span 6', padding: 24 }}>
                        <div className="ya-icon" style={{ background: 'var(--ya-bg)', color: 'var(--ya-gold)' }}>
                            <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, stroke: 'currentColor', fill: 'none', strokeWidth: 1.5 }}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v5l3 2"/></svg>
                        </div>
                        <div className="ya-text">
                            <h4 style={{ fontFamily: 'var(--ya-serif)', fontSize: 20, margin: '0 0 4px', color: 'var(--ya-ink)', fontWeight: 400 }}>Video Analysis</h4>
                            <p style={{ fontSize: 13, margin: 0, color: 'var(--ya-ink-soft)' }}>Upload past sessions and get scored frame-by-frame.</p>
                        </div>
                    </div>

                    <div className="ya-card small" style={{ gridColumn: 'span 6', padding: 24 }}>
                        <div className="ya-icon" style={{ background: 'var(--ya-bg)', color: 'var(--ya-brown-2)' }}>
                            <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, stroke: 'currentColor', fill: 'none', strokeWidth: 1.5 }}><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                        </div>
                        <div className="ya-text">
                            <h4 style={{ fontFamily: 'var(--ya-serif)', fontSize: 20, margin: '0 0 4px', color: 'var(--ya-ink)', fontWeight: 400 }}>Global Leaderboards</h4>
                            <p style={{ fontSize: 13, margin: 0, color: 'var(--ya-ink-soft)' }}>Compare your highest scores with practitioners worldwide.</p>
                        </div>
                    </div>
                </section>

                <footer style={{ borderTop: '1px solid var(--ya-rule)', paddingTop: 32, paddingBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ya-muted)' }}>
                        &copy; {new Date().getFullYear()} Yoga Pose Tracker. All rights reserved.
                    </p>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ fontSize: 13, color: 'var(--ya-muted)', cursor: 'pointer' }}>Privacy</span>
                        <span style={{ fontSize: 13, color: 'var(--ya-muted)', cursor: 'pointer' }}>Terms</span>
                    </div>
                </footer>
            </div>
            
            {/* Global styles specifically for responsive landing page */}
            <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 900px) {
                    main { grid-template-columns: 1fr !important; gap: 32px !important; min-height: auto !important; }
                    main > div:first-child { padding-right: 0 !important; }
                    main > div:last-child { min-height: 400px !important; }
                }
            `}} />
        </div>
    );
};

export default LandingPage;
