import React from 'react';
import { Header } from '../components';
import { Calendar, Clock, Trophy, ChevronRight } from 'lucide-react';

const mockHistory = [
    {
        id: 1,
        date: '2024-03-20',
        time: '08:30 AM',
        duration: '15 min',
        score: 92,
        poses: ['Warrior I', 'Warrior II', 'Triangle'],
        type: 'Morning Flow'
    },
    {
        id: 2,
        date: '2024-03-19',
        time: '06:15 PM',
        duration: '20 min',
        score: 88,
        poses: ['Tree', 'Mountain', 'Plank'],
        type: 'Balance Session'
    },
    {
        id: 3,
        date: '2024-03-18',
        time: '07:45 AM',
        duration: '12 min',
        score: 85,
        poses: ['Down Dog', 'Cobra', 'Child'],
        type: 'Quick Stretch'
    },
    {
        id: 4,
        date: '2024-03-15',
        time: '09:00 AM',
        duration: '30 min',
        score: 95,
        poses: ['Warrior I', 'Warrior II', 'Extended Side Angle'],
        type: 'Power Yoga'
    }
];

const SessionHistoryPage = ({ onHomeClick }) => {
    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-200">
            <Header onHomeClick={onHomeClick} />

            <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Session History</h1>
                    <p className="text-gray-600">Track your progress and review past sessions</p>
                </div>

                <div className="space-y-4">
                    {mockHistory.map((session) => (
                        <div
                            key={session.id}
                            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 hover:shadow-md transition-all duration-200 group cursor-pointer"
                        >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

                                {/* Left Section: Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                            {session.type}
                                        </span>
                                        <span className="text-gray-400 text-sm flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {session.date}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-purple-400" />
                                            <span>{session.duration}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-400">At:</span> {session.time}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {session.poses.map((pose, index) => (
                                            <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                                {pose}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Section: Score and Action */}
                                <div className="flex items-center w-full md:w-auto justify-between md:justify-end gap-6">
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500 mb-1">Avg Score</div>
                                        <div className="flex items-center gap-2">
                                            <Trophy className={`w-5 h-5 ${session.score >= 90 ? 'text-yellow-500' : 'text-purple-400'}`} />
                                            <span className={`text-2xl font-bold ${session.score >= 90 ? 'text-gray-900' : 'text-gray-700'}`}>
                                                {session.score}%
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
            </div>
        </div>
    );
};

export default SessionHistoryPage;
