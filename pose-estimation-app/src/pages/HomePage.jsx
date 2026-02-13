import React from 'react';
import { Play, Layers, CircleHelp, LogOut, Flower, History, Trophy } from 'lucide-react';

const HomePage = ({ onStartSession, onStartSet, onLogout, onSessionHistory, onLeaderboard, onUploadVideo }) => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-200">
        <nav className="flex items-center justify-between p-6 px-8">
            <div className="flex items-center gap-3">
                {/* <div className="bg-purple-600 p-2 rounded-xl shadow-md">
                    <Flower className="w-6 h-6 text-white" />
                </div> */}
                <span className="text-xl font-bold text-gray-800 tracking-tight">YogaFlow</span>
            </div>
            <div className="flex items-center gap-3">
                <button className="p-2.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200" title="Help">
                    Help
                    {/* <CircleHelp className="w-6 h-6" /> */}
                </button>
                <button
                    onClick={onLogout}
                    className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                    title="Logout"
                >
                    <LogOut className="w-6 h-6" />
                </button>
            </div>
        </nav>

        <div className="flex-1 flex flex-col items-center justify-center p-8 pb-32">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold text-gray-900 mb-4">
                    Yoga Pose Tracker
                </h1>
                <p className="text-gray-600 text-lg max-w-md mx-auto">
                    Perfect your practice with AI-powered pose detection and real-time feedback
                </p>
            </div>

            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/*
            <button
                onClick={onStartSession}
                className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100"
            >
                <div className="absolute inset-0 bg-purple-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                    <div className="bg-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                        <Play className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Start Session</h3>
                    <p className="text-gray-600">Begin tracking your yoga poses with live feedback</p>
                </div>
            </button>
            */}

                <button
                    onClick={onStartSet}
                    className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100"
                >
                    <div className="absolute inset-0 bg-teal-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        {/* <div className="bg-teal-600 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                            <Layers className="w-8 h-8 text-white" />
                        </div> */}
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Start Set</h3>
                        <p className="text-gray-600">Practice a curated sequence of yoga poses</p>
                    </div>
                </button>

                <button
                    onClick={onSessionHistory}
                    className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100"
                >
                    <div className="absolute inset-0 bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        {/* <div className="bg-orange-500 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                            <History className="w-8 h-8 text-white" />
                        </div> */}
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Session History</h3>
                        <p className="text-gray-600">View your past sessions and progress</p>
                    </div>
                </button>

                <button
                    onClick={onLeaderboard}
                    className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100"
                >
                    <div className="absolute inset-0 bg-yellow-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        {/* <div className="bg-yellow-500 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                            <Trophy className="w-8 h-8 text-white" />
                        </div> */}
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Leaderboard</h3>
                        <p className="text-gray-600">Check ranking of everyone's score</p>
                    </div>
                </button>

                <button
                    onClick={onUploadVideo}
                    className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100"
                >
                    <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Upload Video</h3>
                        <p className="text-gray-600">Score your yoga pose from a recorded video</p>
                    </div>
                </button>
            </div>
        </div>
    </div>
);

export default HomePage;
