import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, Play, BarChart3, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const UploadVideoPage = ({ onHomeClick }) => {
    const [poses, setPoses] = useState([]);
    const [selectedPose, setSelectedPose] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
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
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-200">
            {/* Header */}
            <nav className="flex items-center justify-between p-6 px-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onHomeClick}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <span className="text-xl font-bold text-gray-800 tracking-tight">
                        Upload Video
                    </span>
                </div>
            </nav>

            <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
                {/* Pose Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Target Pose
                    </label>
                    <select
                        value={selectedPose}
                        onChange={(e) => setSelectedPose(e.target.value)}
                        className="w-full max-w-sm bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                    >
                        {poses.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Upload Area */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 mb-6 ${dragActive
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-300 bg-white/60 hover:border-purple-400 hover:bg-purple-50/50'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files?.[0])}
                    />
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-600">
                        {videoFile
                            ? videoFile.name
                            : 'Drag & drop a video here, or click to browse'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        Supports MP4, MOV, AVI, MKV
                    </p>
                </div>

                {/* Video Preview */}
                {videoPreviewUrl && (
                    <div className="mb-6">
                        <video
                            src={videoPreviewUrl}
                            controls
                            muted
                            className="w-full max-w-2xl rounded-2xl shadow-lg border border-gray-100"
                        />
                    </div>
                )}

                {/* Analyze Button */}
                {videoFile && (
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="w-full max-w-2xl flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 mb-8"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Analyzing... This may take a while
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                Analyze Pose
                            </>
                        )}
                    </button>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
                        {error}
                    </div>
                )}

                {/* Results */}
                {results && (
                    <div className="space-y-6">
                        {/* Score Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                label="Average Score"
                                value={results.avg_score.toFixed(1)}
                                color="purple"
                            />
                            <StatCard
                                label="Max Score"
                                value={results.max_score.toFixed(1)}
                                color="green"
                            />
                            <StatCard
                                label="Min Score"
                                value={results.min_score.toFixed(1)}
                                color="orange"
                            />
                            <StatCard
                                label="Frames Analyzed"
                                value={results.total_frames}
                                color="blue"
                            />
                        </div>

                        {/* Score Chart */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-5 h-5 text-purple-600" />
                                <h3 className="text-lg font-bold text-gray-800">
                                    Score Over Time
                                </h3>
                            </div>
                            <ScoreChart scores={results.scores} fps={results.fps} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─── Sub-components ─── */

const StatCard = ({ label, value, color }) => {
    const colorMap = {
        purple: 'from-purple-500 to-purple-600',
        green: 'from-green-500 to-green-600',
        orange: 'from-orange-400 to-orange-500',
        blue: 'from-blue-500 to-blue-600',
    };

    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 text-center">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p
                className={`text-3xl font-bold bg-gradient-to-r ${colorMap[color]} bg-clip-text text-transparent`}
            >
                {value}
            </p>
        </div>
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
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
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
                            stroke="#e5e7eb"
                            strokeWidth="1"
                        />
                        <text
                            x={pad.left - 8}
                            y={y + 4}
                            textAnchor="end"
                            className="fill-gray-400"
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
                        className="fill-gray-400"
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
                stroke="url(#scoreGradient)"
                strokeWidth="2"
                strokeLinejoin="round"
            />

            <defs>
                <linearGradient id="scoreGradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#9333ea" />
                    <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export default UploadVideoPage;
