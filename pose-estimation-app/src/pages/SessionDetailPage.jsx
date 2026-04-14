import React, { useState, useEffect } from 'react';
import { Header } from '../components';
import {
    Home, ChevronLeft, Trophy, TrendingUp, TrendingDown,
    BarChart3, Loader2, AlertCircle, Calendar, Clock, CheckCircle2
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

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

const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-500';
};

const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-400';
};

const getScoreGradient = (score) => {
    if (score >= 80) return 'from-green-400 to-emerald-600';
    if (score >= 50) return 'from-yellow-400 to-amber-600';
    return 'from-red-400 to-rose-600';
};

const SessionDetailPage = ({ sessionId, onBackClick, onHomeClick }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!sessionId) return;
        const fetchAnalytics = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/api/session/${sessionId}/analytics`);
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

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-200">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md border-b border-purple-200">
                <button
                    onClick={onBackClick}
                    className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="font-medium">History</span>
                </button>
                <h1 className="text-xl font-bold text-gray-900">Session Details</h1>
                <button
                    onClick={onHomeClick}
                    className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                    <Home className="w-5 h-5" />
                    <span className="font-medium">Home</span>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-3xl mx-auto space-y-5">

                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                            <p className="text-gray-500 font-medium">Loading session details...</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5">
                            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {analytics && !loading && (
                        <>
                            {/* Session Meta */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <CheckCircle2 className="w-7 h-7 text-green-300" />
                                    <h2 className="text-xl font-bold">Completed Session</h2>
                                </div>
                                <div className="flex flex-wrap gap-5 text-purple-100 text-sm">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(analytics.created_at)}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4" />
                                        {formatTime(analytics.created_at)}
                                    </div>
                                </div>
                            </div>

                            {/* Overall Score */}
                            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg">
                                <div className="text-gray-500 text-sm mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" /> Overall Average Score
                                </div>
                                <div className="flex items-end gap-3">
                                    <div className={`text-6xl font-bold ${getScoreColor(analytics.overall_avg_score)}`}>
                                        {analytics.overall_avg_score.toFixed(1)}%
                                    </div>
                                    <div className="text-gray-400 text-sm mb-2">
                                        across {analytics.total_poses} pose{analytics.total_poses !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full bg-gradient-to-r ${getScoreGradient(analytics.overall_avg_score)} transition-all duration-1000 ease-out`}
                                        style={{ width: `${Math.min(analytics.overall_avg_score, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Best & Worst */}
                            {analytics.total_poses > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {analytics.best_pose && (
                                        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-green-200 shadow-lg">
                                            <div className="flex items-center gap-2 text-green-600 mb-2">
                                                <TrendingUp className="w-5 h-5" />
                                                <span className="text-sm font-medium">Best Pose</span>
                                            </div>
                                            <div className="text-xl font-bold text-gray-900">{analytics.best_pose.name}</div>
                                            <div className="text-3xl font-bold text-green-600 mt-1">
                                                {analytics.best_pose.avg_score.toFixed(1)}%
                                            </div>
                                        </div>
                                    )}
                                    {analytics.worst_pose && (
                                        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-orange-200 shadow-lg">
                                            <div className="flex items-center gap-2 text-orange-600 mb-2">
                                                <TrendingDown className="w-5 h-5" />
                                                <span className="text-sm font-medium">Needs Improvement</span>
                                            </div>
                                            <div className="text-xl font-bold text-gray-900">{analytics.worst_pose.name}</div>
                                            <div className="text-3xl font-bold text-orange-600 mt-1">
                                                {analytics.worst_pose.avg_score.toFixed(1)}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Per-Pose Breakdown */}
                            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg">
                                <h3 className="text-gray-700 font-semibold mb-4">Pose Breakdown</h3>
                                {analytics.poses.length === 0 ? (
                                    <p className="text-gray-400 text-sm italic">No pose data available.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {analytics.poses.map((pose, index) => (
                                            <div key={index} className="bg-white/50 rounded-xl p-4 border border-purple-50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-gray-800">{pose.label}</span>
                                                    <span className={`text-lg font-bold ${getScoreColor(pose.avg_score)}`}>
                                                        {pose.avg_score.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                                    <div
                                                        className={`h-2.5 rounded-full ${getScoreBgColor(pose.avg_score)} transition-all duration-700 ease-out`}
                                                        style={{ width: `${Math.min(pose.avg_score, 100)}%` }}
                                                    />
                                                </div>
                                                <div className="flex gap-4 text-xs text-gray-500">
                                                    <span>Max: <span className="font-medium text-gray-700">{pose.max_score.toFixed(1)}%</span></span>
                                                    <span>Min: <span className="font-medium text-gray-700">{pose.min_score.toFixed(1)}%</span></span>
                                                    <span>Frames: <span className="font-medium text-gray-700">{pose.total_frames}</span></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Trophy footer */}
                            {analytics.overall_avg_score >= 80 && (
                                <div className="flex items-center justify-center gap-3 py-4">
                                    <Trophy className="w-6 h-6 text-yellow-500" />
                                    <span className="text-gray-600 font-medium">Great session! Keep it up.</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SessionDetailPage;
