import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Home, User, Mail, Calendar, Activity, Trophy, Target,
    BarChart3, Loader2, TrendingUp, Layers, Clock
} from 'lucide-react';
import { API_BASE } from '../config';

const ProfilePage = ({ onHomeClick }) => {
    const { token } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) return;
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/api/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Failed to load profile');
                const data = await res.json();
                setProfile(data);
            } catch (err) {
                console.error('Profile fetch error:', err);
                setError(err.message);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [token]);

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-500';
    };

    const getScoreBg = (score) => {
        if (score >= 80) return 'from-green-400 to-emerald-600';
        if (score >= 50) return 'from-yellow-400 to-amber-600';
        return 'from-red-400 to-rose-600';
    };

    const getScoreBarBg = (score) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    };

    const formatRelativeDate = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateStr);
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-200">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md border-b border-purple-200">
                <button
                    onClick={onHomeClick}
                    className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                    <Home className="w-5 h-5" />
                    <span className="font-medium">Home</span>
                </button>
                <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
                <div className="w-20" />
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                            <p className="text-gray-600 font-medium">Loading your profile...</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 text-center">
                            {error}
                        </div>
                    )}

                    {/* Profile Content */}
                    {profile && !loading && (
                        <>
                            {/* User Info Card */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                                <div className="flex items-center gap-5">
                                    {/* Avatar */}
                                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0">
                                        {profile.name
                                            ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                            : '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-2xl font-bold truncate">{profile.name}</h2>
                                        <div className="flex items-center gap-2 text-purple-200 mt-1">
                                            <Mail className="w-4 h-4 shrink-0" />
                                            <span className="text-sm truncate">{profile.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-purple-200 mt-1">
                                            <Calendar className="w-4 h-4 shrink-0" />
                                            <span className="text-sm">Joined {formatDate(profile.joined_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-lg text-center">
                                    <Activity className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                                    <div className="text-3xl font-bold text-gray-900">{profile.total_sessions}</div>
                                    <div className="text-gray-500 text-xs mt-1">Total Sessions</div>
                                </div>
                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-lg text-center">
                                    <Trophy className="w-6 h-6 text-green-500 mx-auto mb-2" />
                                    <div className="text-3xl font-bold text-gray-900">{profile.completed_sessions}</div>
                                    <div className="text-gray-500 text-xs mt-1">Completed</div>
                                </div>
                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-lg text-center">
                                    <Target className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                                    <div className="text-3xl font-bold text-gray-900">{profile.total_poses_practiced}</div>
                                    <div className="text-gray-500 text-xs mt-1">Poses Practiced</div>
                                </div>
                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-lg text-center">
                                    <Layers className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                                    <div className="text-3xl font-bold text-gray-900">{profile.custom_sets_count}</div>
                                    <div className="text-gray-500 text-xs mt-1">Custom Sets</div>
                                </div>
                            </div>

                            {/* Overall Average Score */}
                            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg">
                                <div className="text-gray-600 text-sm mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    Overall Average Score
                                </div>
                                <div className="flex items-end gap-4">
                                    <div className={`text-6xl font-bold ${getScoreColor(profile.overall_avg_score)}`}>
                                        {profile.overall_avg_score > 0 ? `${profile.overall_avg_score}%` : '—'}
                                    </div>
                                    <div className="text-gray-400 text-sm mb-2">
                                        across {profile.completed_sessions} completed sessions
                                    </div>
                                </div>
                                {profile.overall_avg_score > 0 && (
                                    <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full bg-gradient-to-r ${getScoreBg(profile.overall_avg_score)} transition-all duration-1000 ease-out`}
                                            style={{ width: `${Math.min(profile.overall_avg_score, 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Per-Pose Performance */}
                            {profile.per_pose_stats && profile.per_pose_stats.length > 0 && (
                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg">
                                    <h3 className="text-gray-700 font-semibold mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-purple-500" />
                                        Per-Pose Performance
                                    </h3>
                                    <div className="space-y-4">
                                        {profile.per_pose_stats.map((pose, idx) => (
                                            <div key={idx} className="bg-white/50 rounded-xl p-4 border border-purple-50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-gray-800">{pose.label}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-gray-500">{pose.attempts} attempts</span>
                                                        <span className={`text-lg font-bold ${getScoreColor(pose.best_score)}`}>
                                                            {pose.best_score}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                                    <div
                                                        className={`h-2.5 rounded-full ${getScoreBarBg(pose.best_score)} transition-all duration-700 ease-out`}
                                                        style={{ width: `${Math.min(pose.best_score, 100)}%` }}
                                                    />
                                                </div>
                                                <div className="flex gap-4 text-xs text-gray-500">
                                                    <span>Best: <span className="font-medium text-gray-700">{pose.best_score}%</span></span>
                                                    <span>Avg: <span className="font-medium text-gray-700">{pose.avg_score}%</span></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Sessions */}
                            {profile.recent_sessions && profile.recent_sessions.length > 0 && (
                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg">
                                    <h3 className="text-gray-700 font-semibold mb-4 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-purple-500" />
                                        Recent Sessions
                                    </h3>
                                    <div className="space-y-3">
                                        {profile.recent_sessions.map((session, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white/50 rounded-xl p-4 border border-purple-50">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${session.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                        <span className="text-sm font-medium text-gray-800">
                                                            {session.total_poses} pose{session.total_poses !== 1 ? 's' : ''}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{formatRelativeDate(session.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className={`text-lg font-bold ${getScoreColor(session.overall_avg_score)}`}>
                                                    {session.overall_avg_score > 0 ? `${session.overall_avg_score}%` : '—'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty state if no data */}
                            {profile.total_sessions === 0 && (
                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-8 border border-white/50 shadow-lg text-center">
                                    <Activity className="w-12 h-12 text-purple-300 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-1">No sessions yet</h3>
                                    <p className="text-gray-500 text-sm mb-4">Start practicing to see your stats here!</p>
                                    <button
                                        onClick={onHomeClick}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 shadow"
                                    >
                                        Start Practicing
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
