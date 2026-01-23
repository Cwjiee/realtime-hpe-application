import React from 'react';
import { Play, Layers } from 'lucide-react';

const HomePage = ({ onStartSession, onStartSet }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
        <div className="text-center mb-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                Yoga Pose Tracker
            </h1>
            <p className="text-gray-600 text-lg max-w-md mx-auto">
                Perfect your practice with AI-powered pose detection and real-time feedback
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
                onClick={onStartSession}
                className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                <div className="relative z-10">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                        <Play className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Start Session</h3>
                    <p className="text-gray-600">Begin tracking your yoga poses with live feedback</p>
                </div>
            </button>

            <button
                onClick={onStartSet}
                className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-teal-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                <div className="relative z-10">
                    <div className="bg-gradient-to-r from-green-500 to-teal-500 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                        <Layers className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Start Set</h3>
                    <p className="text-gray-600">Practice a curated sequence of yoga poses</p>
                </div>
            </button>
        </div>
    </div>
);

export default HomePage;
