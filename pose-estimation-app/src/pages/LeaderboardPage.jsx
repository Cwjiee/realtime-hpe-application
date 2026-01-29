import React, { useState } from 'react';
import { Header } from '../components';
import { Trophy, Medal, Crown } from 'lucide-react';

const mockRankings = {
    all: [
        { rank: 1, name: 'Jessica Chen', score: 98, avatar: 'JC' },
        { rank: 2, name: 'David Kim', score: 96, avatar: 'DK' },
        { rank: 3, name: 'Sarah Johnson', score: 95, avatar: 'SJ' },
        { rank: 4, name: 'Mike Ross', score: 92, avatar: 'MR' },
        { rank: 5, name: 'Emily Davis', score: 90, avatar: 'ED' },
    ],
    mountain: [
        { rank: 1, name: 'David Kim', score: 99, avatar: 'DK' },
        { rank: 2, name: 'Jessica Chen', score: 97, avatar: 'JC' },
        { rank: 3, name: 'Sarah Johnson', score: 96, avatar: 'SJ' },
        { rank: 4, name: 'Alex Wong', score: 94, avatar: 'AW' },
        { rank: 5, name: 'Mike Ross', score: 91, avatar: 'MR' },
    ],
    tree: [
        { rank: 1, name: 'Sarah Johnson', score: 98, avatar: 'SJ' },
        { rank: 2, name: 'Jessica Chen', score: 95, avatar: 'JC' },
        { rank: 3, name: 'Emily Davis', score: 93, avatar: 'ED' },
        { rank: 4, name: 'David Kim', score: 90, avatar: 'DK' },
        { rank: 5, name: 'Tom Wilson', score: 88, avatar: 'TW' },
    ],
    warrior1: [
        { rank: 1, name: 'Mike Ross', score: 97, avatar: 'MR' },
        { rank: 2, name: 'David Kim', score: 95, avatar: 'DK' },
        { rank: 3, name: 'Jessica Chen', score: 94, avatar: 'JC' },
        { rank: 4, name: 'Sarah Johnson', score: 92, avatar: 'SJ' },
        { rank: 5, name: 'Alex Wong', score: 89, avatar: 'AW' },
    ],
    warrior2: [
        { rank: 1, name: 'Jessica Chen', score: 99, avatar: 'JC' },
        { rank: 2, name: 'Emily Davis', score: 96, avatar: 'ED' },
        { rank: 3, name: 'David Kim', score: 95, avatar: 'DK' },
        { rank: 4, name: 'Sarah Johnson', score: 93, avatar: 'SJ' },
        { rank: 5, name: 'Mike Ross', score: 90, avatar: 'MR' },
    ]
};

const LeaderboardPage = ({ onHomeClick }) => {
    const [selectedPose, setSelectedPose] = useState('all');

    const currentRankings = mockRankings[selectedPose] || mockRankings.all;

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
                            <option value="mountain">Mountain Pose</option>
                            <option value="tree">Tree Pose</option>
                            <option value="warrior1">Warrior I</option>
                            <option value="warrior2">Warrior II</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-3xl shadow-lg border border-white/50 overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-4 p-4 border-b border-purple-100 bg-purple-50/50 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="col-span-2 text-center">Rank</div>
                        <div className="col-span-7 md:col-span-8">User</div>
                        <div className="col-span-3 md:col-span-2 text-right">Score</div>
                    </div>

                    {/* List */}
                    <div className="divide-y divide-purple-50">
                        {currentRankings.map((user) => (
                            <div
                                key={user.rank}
                                className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/50 transition-colors duration-150 ${user.rank === 1 ? 'bg-yellow-50/30' : ''}`}
                            >
                                <div className="col-span-2 flex justify-center">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-full ${user.rank <= 3 ? 'bg-white shadow-sm' : ''}`}>
                                        {getRankIcon(user.rank)}
                                    </div>
                                </div>
                                <div className="col-span-7 md:col-span-8 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold shadow-sm">
                                        {user.avatar}
                                    </div>
                                    <span className={`font-medium ${user.rank <= 3 ? 'text-gray-900 text-lg' : 'text-gray-700'}`}>
                                        {user.name}
                                    </span>
                                </div>
                                <div className="col-span-3 md:col-span-2 text-right">
                                    <span className="font-bold text-gray-900 text-xl">{user.score}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardPage;
