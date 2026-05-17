import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

// Map pose names to their outline image files in public/yoga_outline/
const POSE_OUTLINE_MAP = {
    'Tree Pose (Vrksasana)': '/yoga_outline/tree.jpg',
    'Warrior 1 (Virabhadrasana I)': '/yoga_outline/warrior1.png',
    'Warrior 2 (Virabhadrasana II)': '/yoga_outline/warrior2.png',
    'Triangle Pose (Trikonasana)': '/yoga_outline/triangle.jpg',
};

const UploadVideoPage = ({ onHomeClick }) => {
    const { token } = useAuth();
    const [poses, setPoses] = useState([]);
    const [selectedPose, setSelectedPose] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [showReference, setShowReference] = useState(false);
    const fileInputRef = useRef(null);

    // Fetch available poses on mount
    useEffect(() => {
        fetch(`${API_BASE}/api/poses`)
            .then((res) => res.json())
            .then((data) => {
                setPoses(data.poses);
                if (data.poses.length > 0) setSelectedPose(data.poses[0]);
            })
            .catch(() => setError('Failed to connect to backend. Is the server running?'));
    }, []);

    const handleFileSelect = (file) => {
        if (!file) return;
        setVideoFile(file);
        setVideoPreviewUrl(URL.createObjectURL(file));
        setResults(null);
        setError(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('video/')) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => setDragActive(false);

    const handleAnalyze = async () => {
        if (!videoFile || !selectedPose) return;

        setIsAnalyzing(true);
        setError(null);
        setResults(null);

        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('pose_name', selectedPose);

        try {
            const res = await fetch(`${API_BASE}/api/analyze`, {
                method: 'POST',
                headers: token ? {
                    'Authorization': `Bearer ${token}`
                } : {},
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error: ${res.status}`);
            }

            const data = await res.json();
            setResults(data);
        } catch (err) {
            setError(err.message || 'Analysis failed');
        } finally {
            setIsAnalyzing(false);
        }
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

                {/* Title Block */}
                <div className="ya-title-block">
                    <div>
                        <h1 style={{ fontFamily: 'var(--ya-serif)', fontSize: 'clamp(40px, 4.6vw, 64px)', fontWeight: 400, letterSpacing: '-0.014em', lineHeight: 1.0, margin: '0 0 12px', color: 'var(--ya-ink)', textWrap: 'balance' }}>Upload <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>Video</em></h1>
                        <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ya-ink-soft)', maxWidth: '50ch', margin: 0 }}>Upload a pre-recorded session for detailed pose analysis and scoring.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Pose Selection */}
                    <div style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 16, padding: '24px 28px' }}>
                        <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)', marginBottom: 12, fontWeight: 500 }}>
                            Target Pose
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <select
                                value={selectedPose}
                                onChange={(e) => setSelectedPose(e.target.value)}
                                style={{ flex: 1, minWidth: 250, background: 'var(--ya-paper-3)', border: '1px solid var(--ya-rule)', borderRadius: 12, padding: '12px 16px', fontSize: 16, color: 'var(--ya-ink)', outline: 'none', cursor: 'pointer' }}
                            >
                                {poses.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => setShowReference((v) => !v)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                                    transition: 'all 0.2s', border: '1px solid var(--ya-rule)', background: showReference ? 'rgba(110,118,87,0.1)' : 'var(--ya-paper-3)',
                                    color: showReference ? 'var(--ya-forest)' : 'var(--ya-ink-soft)'
                                }}
                            >
                                {showReference ? (
                                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                                {showReference ? 'Hide Reference' : 'Show Reference'}
                            </button>
                        </div>
                    </div>

                    {/* Visual Reference */}
                    {showReference && selectedPose && POSE_OUTLINE_MAP[selectedPose] && (
                        <div style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 16, padding: '16px', maxWidth: 300 }}>
                            <p style={{ fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)', marginBottom: 12, fontWeight: 500 }}>Reference</p>
                            <img
                                src={POSE_OUTLINE_MAP[selectedPose]}
                                alt={`${selectedPose} reference`}
                                style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 250 }}
                            />
                        </div>
                    )}

                    {/* Upload Area */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            position: 'relative', cursor: 'pointer', border: `2px dashed ${dragActive ? 'var(--ya-olive)' : 'var(--ya-rule)'}`,
                            borderRadius: 18, padding: '60px 40px', textAlign: 'center', transition: 'all 0.2s',
                            background: dragActive ? 'rgba(110,118,87,0.08)' : 'var(--ya-paper-3)',
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileSelect(e.target.files?.[0])}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--ya-paper-2)', display: 'grid', placeItems: 'center', color: 'var(--ya-olive)' }}>
                                <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            </div>
                            <div>
                                <p style={{ fontSize: 18, fontFamily: 'var(--ya-serif)', color: 'var(--ya-ink)', margin: '0 0 4px' }}>
                                    {videoFile ? videoFile.name : 'Drag & drop a video here, or click to browse'}
                                </p>
                                <p style={{ fontSize: 13, color: 'var(--ya-muted)', margin: 0 }}>Supports MP4, MOV, AVI, MKV</p>
                            </div>
                        </div>
                    </div>

                    {/* Video Preview */}
                    {videoPreviewUrl && (
                        <div style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 18, overflow: 'hidden', padding: 8 }}>
                            <video
                                src={videoPreviewUrl}
                                controls
                                muted
                                style={{ width: '100%', borderRadius: 10, display: 'block' }}
                            />
                        </div>
                    )}

                    {/* Analyze Button */}
                    {videoFile && (
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="ya-sp-start"
                            style={{ width: '100%', padding: '20px 30px', fontSize: 16, marginTop: 10 }}
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="ya-spinner" style={{ width: 20, height: 20, borderColor: 'var(--ya-paper-2)', borderTopColor: 'transparent' }} />
                                    Analyzing... This may take a while
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    Analyze Pose
                                </>
                            )}
                        </button>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-fix)', color: 'var(--ya-fix)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    {/* Results */}
                    {results && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
                            {/* Score Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                <StatCard label="Average Score" value={results.avg_score.toFixed(1)} color="var(--ya-ink)" />
                                <StatCard label="Max Score" value={results.max_score.toFixed(1)} color="var(--ya-ok)" />
                                <StatCard label="Min Score" value={results.min_score.toFixed(1)} color="var(--ya-warn)" />
                                <StatCard label="Frames Analyzed" value={results.total_frames} color="var(--ya-forest)" />
                            </div>

                            {/* Score Chart */}
                            <div style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 18, padding: '24px 28px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                    <h3 style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, margin: 0, color: 'var(--ya-ink)' }}>Score Over <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>Time</em></h3>
                                </div>
                                <ScoreChart scores={results.scores} fps={results.fps} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── Sub-components ─── */

const StatCard = ({ label, value, color }) => {
    return (
        <article className="ya-card small">
            <div className="ya-head">{label}</div>
            <div className="ya-body" style={{ alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'var(--ya-serif)', fontSize: 36, color: color, lineHeight: 1 }}>{value}</div>
            </div>
        </article>
    );
};

const ScoreChart = ({ scores, fps }) => {
    if (!scores || scores.length === 0) return null;

    const width = 800;
    const height = 250;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    const maxTime = (scores.length - 1) / fps;

    // Downsample for rendering performance if > 500 points
    const step = scores.length > 500 ? Math.ceil(scores.length / 500) : 1;

    const points = [];
    for (let i = 0; i < scores.length; i += step) {
        const x = pad.left + ((i / fps) / maxTime) * chartW;
        const y = pad.top + chartH - (scores[i] / 100) * chartH;
        points.push(`${x},${y}`);
    }

    const polyline = points.join(' ');

    // Y-axis ticks
    const yTicks = [0, 25, 50, 75, 100];
    // X-axis ticks (up to 6)
    const xTickCount = Math.min(6, Math.floor(maxTime));
    const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) =>
        ((maxTime / xTickCount) * i).toFixed(1),
    );

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {/* Grid lines */}
            {yTicks.map((t) => {
                const y = pad.top + chartH - (t / 100) * chartH;
                return (
                    <g key={`y-${t}`}>
                        <line
                            x1={pad.left}
                            x2={pad.left + chartW}
                            y1={y}
                            y2={y}
                            stroke="rgba(196,182,147,0.5)"
                            strokeWidth="1"
                        />
                        <text
                            x={pad.left - 12}
                            y={y + 4}
                            textAnchor="end"
                            fill="var(--ya-muted)"
                            fontSize="11"
                        >
                            {t}
                        </text>
                    </g>
                );
            })}

            {/* X-axis labels */}
            {xTicks.map((t) => {
                const x = pad.left + (parseFloat(t) / maxTime) * chartW;
                return (
                    <text
                        key={`x-${t}`}
                        x={x}
                        y={height - 8}
                        textAnchor="middle"
                        fill="var(--ya-muted)"
                        fontSize="11"
                    >
                        {t}s
                    </text>
                );
            })}

            {/* Score line */}
            <polyline
                points={polyline}
                fill="none"
                stroke="var(--ya-forest)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
};

export default UploadVideoPage;
