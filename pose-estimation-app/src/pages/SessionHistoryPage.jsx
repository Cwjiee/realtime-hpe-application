import React, { useState, useEffect } from 'react';
import { Header } from '../components';
import { Calendar, Clock, Trophy, ChevronRight, Loader2, AlertCircle, CheckCircle2, Activity } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

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

const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-500';
};

const getTrophyColor = (score) => {
    if (score >= 80) return 'text-yellow-500';
    if (score >= 50) return 'text-purple-400';
    return 'text-gray-400';
};

const SessionHistoryPage = ({ onHomeClick, onSessionSelect }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSessions = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/api/sessions`);
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

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-200">
            <Header onHomeClick={onHomeClick} />

            <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Session History</h1>
                    <p className="text-gray-600">Track your progress and review past sessions</p>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                        <p className="text-gray-500 font-medium">Loading your sessions...</p>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5">
                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && sessions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <Activity className="w-14 h-14 text-purple-200" />
                        <h2 className="text-xl font-semibold text-gray-700">No sessions yet</h2>
                        <p className="text-gray-500">Complete a Pose Set to see your history here.</p>
                        <button
                            onClick={onHomeClick}
                            className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 shadow"
                        >
                            Start a Session
                        </button>
                    </div>
                )}

                {/* Sessions List */}
                {!loading && !error && sessions.length > 0 && (
                    <div className="space-y-4">
                        {sessions.map((session) => (
                            <div
                                key={session.session_id}
                                onClick={() => onSessionSelect?.(session.session_id)}
                                className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 hover:shadow-md hover:scale-[1.01] transition-all duration-200 group cursor-pointer"
                            >
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

                                    {/* Left: Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {/* Status badge */}
                                            {session.status === 'completed' ? (
                                                <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                                    <CheckCircle2 className="w-3 h-3" /> Completed
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                                    <Activity className="w-3 h-3" /> In Progress
                                                </span>
                                            )}
                                            <span className="text-gray-400 text-sm flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {formatDate(session.created_at)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-purple-400" />
                                                <span>{formatTime(session.created_at)}</span>
                                            </div>
                                            <div className="text-gray-400">
                                                {session.total_poses} pose{session.total_poses !== 1 ? 's' : ''}
                                            </div>
                                        </div>

                                        {/* Pose tags */}
                                        <div className="flex flex-wrap gap-2">
                                            {session.poses.length > 0 ? (
                                                session.poses.map((pose, index) => (
                                                    <span
                                                        key={index}
                                                        className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded text-xs font-medium"
                                                    >
                                                        {pose}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No poses recorded</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Score */}
                                    <div className="flex items-center w-full md:w-auto justify-between md:justify-end gap-6">
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500 mb-1">Avg Score</div>
                                            <div className="flex items-center gap-2">
                                                <Trophy className={`w-5 h-5 ${getTrophyColor(session.overall_avg_score)}`} />
                                                <span className={`text-2xl font-bold ${getScoreColor(session.overall_avg_score)}`}>
                                                    {session.total_poses > 0 ? `${session.overall_avg_score}%` : '—'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-200">
                                            <div className="bg-white p-2 rounded-full shadow-sm text-purple-600">
                                                <ChevronRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionHistoryPage;
