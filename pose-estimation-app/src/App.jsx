import React, { useState } from 'react';
import { Camera, Home, TrendingUp, User, Play, Settings } from 'lucide-react';
import Webcam from 'react-webcam';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

const YogaPoseTracker = () => {
  const [currentPage, setCurrentPage] = useState('home');

  const poses = [
    { name: 'Tree Pose', duration: '30s', difficulty: 'Beginner' },
    { name: 'Warrior II', duration: '45s', difficulty: 'Intermediate' },
    { name: 'Downward Dog', duration: '60s', difficulty: 'Beginner' },
    { name: 'Triangle Pose', duration: '40s', difficulty: 'Intermediate' },
    { name: 'Child\'s Pose', duration: '90s', difficulty: 'Beginner' },
    { name: 'Cobra Pose', duration: '30s', difficulty: 'Beginner' },
  ];

  const HomePage = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
      <div className="text-center mb-12">
        {/*
        <div className="inline-block p-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-6">
          <Camera className="w-16 h-16 text-white" />
        </div>
        */}
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
          Yoga Pose Tracker
        </h1>
        <p className="text-gray-600 text-lg max-w-md mx-auto">
          Perfect your practice with AI-powered pose detection and real-time feedback
        </p>
      </div>

      {/*
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <button
          onClick={() => setCurrentPage('tracking')}
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

        <button className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-teal-500 opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="relative z-10">
            <div className="bg-gradient-to-r from-blue-500 to-teal-500 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Progress</h3>
            <p className="text-gray-600">View your practice history and improvements</p>
          </div>
        </button>
      </div>
      */}

      <button
        onClick={() => setCurrentPage('tracking')}
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

      {/*
      <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl w-full">
        {poses.slice(0, 6).map((pose, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="text-sm font-semibold text-gray-800 mb-1">{pose.name}</div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{pose.duration}</span>
              <span className={`px-2 py-1 rounded-full ${
                pose.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {pose.difficulty}
              </span>
            </div>
          </div>
        ))}
      </div>
      */}
    </div>
  );

  const TrackingPage = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <header className="bg-black bg-opacity-30 backdrop-blur-sm p-4 flex items-center justify-between border-b border-white border-opacity-10">
        <button
          onClick={() => setCurrentPage('home')}
          className="flex items-center gap-2 text-white hover:text-purple-300 transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">Home</span>
        </button>
        <h2 className="text-xl font-bold text-white">Pose Tracking</h2>
        <button className="text-white hover:text-purple-300 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl bg-black bg-opacity-40 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white border-opacity-20">
          <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
      {/*
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="w-24 h-24 text-white opacity-20" />
            </div>
        */}
            <div className="relative z-10 text-center">
      {/*
              <div className="w-32 h-32 border-4 border-purple-500 rounded-full animate-pulse mb-4 mx-auto" />
        */}
              <p className="text-white text-lg font-medium">Camera feed will appear here</p>
              <p className="text-gray-400 text-sm mt-2">Pose detection overlay will be rendered on video</p>
            </div>
          </div>

          <div className="bg-black bg-opacity-50 p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-black text-sm mb-1">Current Pose</div>
                <div className="text-gray-800 text-xl font-bold">Tree Pose</div>
              </div>
      {/*
              <div className="bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-gray-300 text-sm mb-1">Accuracy</div>
                <div className="text-green-400 text-xl font-bold">92%</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-gray-300 text-sm mb-1">Duration</div>
                <div className="text-blue-400 text-xl font-bold">00:24</div>
              </div>
        */}
            </div>

            <div className="flex gap-4">
              <button className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl">
                Start Tracking
              </button>
      {/*
              <button className="px-8 bg-white bg-opacity-10 hover:bg-opacity-20 text-white font-semibold py-4 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white border-opacity-20">
                Reset
              </button>
        */}
            </div>
          </div>
        </div>

        <div className="mt-6 max-w-4xl w-full">
          <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-2xl p-6 border border-white border-opacity-20">
            <h3 className="text-white font-semibold text-lg mb-4">Feedback & Tips</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                <p className="text-gray-300 text-sm">Good balance - keep your core engaged</p>
              </div>
              {/*
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2" />
                <p className="text-gray-300 text-sm">Try to straighten your standing leg more</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2" />
                <p className="text-gray-300 text-sm">Focus on a fixed point to improve stability</p>
              </div>
              */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return currentPage === 'home' ? <HomePage /> : <TrackingPage />;
};

export default YogaPoseTracker;
