import React, { useState, useEffect } from 'react';
import { Header } from '../components';
import { Trophy, Medal, Crown, Loader2, AlertCircle, Users } from 'lucide-react';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

const LeaderboardPage = ({ onHomeClick }) => {
    const [selectedPose, setSelectedPose] = useState('all');
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useAuth();

    // Decode the current user's ID from the JWT to highlight their row
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

    const getRankIcon = (rank) => {
        switch (rank) {
            case 1:
                return <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" />;
            case 2:
                return <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />;
            case 3:
                return <Medal className="w-6 h-6 text-amber-700 fill-amber-700" />;
            default:
                return <span className="text-gray-500 font-bold w-6 text-center">{rank}</span>;
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-500';
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-200">
            <Header onHomeClick={onHomeClick} />

            <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboard</h1>
                        <p className="text-gray-600">See who's mastering the poses</p>
                    </div>

                    <div className="w-full md:w-64">
                        <select
                            value={selectedPose}
                            onChange={(e) => setSelectedPose(e.target.value)}
                            className="w-full bg-white border border-purple-200 text-gray-700 py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:bg-white focus:border-purple-500 shadow-sm appearance-none cursor-pointer font-medium"
                        >
                            <option value="all">Overall Ranking</option>
                            <option value="warrior1">Warrior I</option>
                            <option value="warrior2">Warrior II</option>
                            <option value="tree">Tree Pose</option>
                            <option value="triangle">Triangle Pose</option>
                        </select>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                        <p className="text-gray-500 font-medium">Loading leaderboard...</p>
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
                {!loading && !error && rankings.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <Users className="w-14 h-14 text-purple-200" />
                        <h2 className="text-xl font-semibold text-gray-700">No rankings yet</h2>
                        <p className="text-gray-500">
                            {selectedPose === 'all'
                                ? 'Complete a session to appear on the leaderboard.'
                                : 'No one has completed this pose yet. Be the first!'}
                        </p>
                        <button
                            onClick={onHomeClick}
                            className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 shadow"
                        >
                            Start a Session
                        </button>
                    </div>
                )}

                {/* Rankings Table */}
                {!loading && !error && rankings.length > 0 && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-3xl shadow-lg border border-white/50 overflow-hidden">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-4 p-4 border-b border-purple-100 bg-purple-50/50 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="col-span-2 text-center">Rank</div>
                            <div className="col-span-7 md:col-span-8">User</div>
                            <div className="col-span-3 md:col-span-2 text-right">Score</div>
                        </div>

                        {/* List */}
                        <div className="divide-y divide-purple-50">
                            {rankings.map((user) => {
                                const isCurrentUser = currentUserId && user.user_id === currentUserId;
                                return (
                                    <div
                                        key={user.user_id}
                                        className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/50 transition-colors duration-150 ${
                                            user.rank === 1 ? 'bg-yellow-50/30' : ''
                                        } ${isCurrentUser ? 'ring-2 ring-purple-400 ring-inset bg-purple-50/30' : ''}`}
                                    >
                                        <div className="col-span-2 flex justify-center">
                                            <div className={`w-10 h-10 flex items-center justify-center rounded-full ${user.rank <= 3 ? 'bg-white shadow-sm' : ''}`}>
                                                {user.rank}
                                            </div>
                                        </div>
                                        <div className="col-span-7 md:col-span-8 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold shadow-sm text-sm">
                                                {user.avatar}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-medium ${user.rank <= 3 ? 'text-gray-900 text-lg' : 'text-gray-700'}`}>
                                                    {user.name}
                                                    {isCurrentUser && (
                                                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                                                            You
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {user.total_sessions} {user.total_sessions === 1 ? 'session' : 'sessions'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-3 md:col-span-2 text-right">
                                            <span className={`font-bold text-xl ${getScoreColor(user.score)}`}>
                                                {user.score}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaderboardPage;
