import React from 'react';

const Header = ({ onHomeClick }) => (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--ya-forest)', color: 'var(--ya-paper-2)' }}>
        <button
            onClick={onHomeClick}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13,
                color: 'var(--ya-paper-2)', background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit',
            }}
        >
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 12l9-9 9 9"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>
            <span style={{ fontWeight: 500 }}>Home</span>
        </button>
        <h2 style={{ fontFamily: 'var(--ya-serif)', fontSize: 18, fontWeight: 400, margin: 0 }}>Pose Tracking</h2>
        <div style={{ width: 40 }} />
    </header>
);

export default Header;
