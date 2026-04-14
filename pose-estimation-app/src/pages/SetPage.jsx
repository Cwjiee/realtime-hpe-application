import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, ChevronRight, Home, CheckCircle2, Loader2, Timer, Activity, Trophy, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import Webcam from 'react-webcam';
import { initializePoseLandmarker, detectPose, drawLandmarks } from '../utils/visionTaskConfig';
import { Switch } from "@/components/ui/switch";

// Import yoga pose outline images
import mountainPose from '../assets/mountain.png';
import plankPose from '../assets/plank.jpg';
import treePose from '../assets/tree.jpg';
import trianglePose from '../assets/triangle.jpg';
import warrior1Pose from '../assets/warrior1.png';
import warrior2Pose from '../assets/warrior2.png';

const API_BASE = 'http://localhost:8000';

// Pose set sequence
const poseSequence = [
    { value: 'warrior1', label: 'Warrior I', image: warrior1Pose },
    { value: 'warrior2', label: 'Warrior II', image: warrior2Pose },
    { value: 'tree', label: 'Tree', image: treePose },
    { value: 'triangle', label: 'Triangle', image: trianglePose },
];

// Phase constants
const PHASE = {
    LOADING: 'loading',       // Model is loading
    COUNTDOWN: 'countdown',   // 5-second countdown before tracking
    TRACKING: 'tracking',     // 5-second pose tracking (collecting frames)
    PROCESSING: 'processing', // Sending frames to backend
    RESULTS: 'results',       // Showing results for current pose
    COMPLETE: 'complete',     // All poses completed
};

const SetPage = ({ onHomeClick }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const [poseLandmarker, setPoseLandmarker] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const animationFrameRef = useRef(null);
    const lastVideoTimeRef = useRef(-1);

    const [visualGuidanceEnabled, setVisualGuidanceEnabled] = useState(false);
    const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
    const [completedPoses, setCompletedPoses] = useState([]);

    // Session state
    const [sessionId, setSessionId] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Phase-based state
    const [phase, setPhase] = useState(PHASE.LOADING);
    const [countdown, setCountdown] = useState(5);
    const [trackingTimeLeft, setTrackingTimeLeft] = useState(5);
    const [collectedFrames, setCollectedFrames] = useState([]);
    const collectedFramesRef = useRef([]);
    const [poseResults, setPoseResults] = useState(null);
    const [error, setError] = useState(null);

    const currentTargetPose = poseSequence[currentPoseIndex];

    // Initialize pose landmarker and create session when component mounts
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                // Create session in parallel with model loading
                const [landmarker] = await Promise.all([
                    initializePoseLandmarker(),
                    createSession(),
                ]);
                setPoseLandmarker(landmarker);
            } catch (error) {
                console.error('Failed to initialize:', error);
                setError('Failed to load pose detection model.');
            }
            setIsLoading(false);
        };
        init();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // Create a new session in MongoDB
    const createSession = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/session/start`, {
                method: 'POST',
            });
            if (res.ok) {
                const data = await res.json();
                setSessionId(data.session_id);
            }
        } catch (err) {
            console.error('Failed to create session:', err);
        }
    };

    // Auto-start countdown once model is ready
    useEffect(() => {
        if (poseLandmarker && phase === PHASE.LOADING) {
            setPhase(PHASE.COUNTDOWN);
            setCountdown(5);
        }
    }, [poseLandmarker, phase]);

    // Countdown timer
    useEffect(() => {
        if (phase !== PHASE.COUNTDOWN) return;

        if (countdown <= 0) {
            // Countdown finished → start tracking
            setPhase(PHASE.TRACKING);
            setTrackingTimeLeft(5);
            collectedFramesRef.current = [];
            setCollectedFrames([]);
            return;
        }

        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [phase, countdown]);

    // Tracking timer
    useEffect(() => {
        if (phase !== PHASE.TRACKING) return;

        if (trackingTimeLeft <= 0) {
            // Tracking finished → process frames
            setPhase(PHASE.PROCESSING);
            sendFramesToBackend();
            return;
        }

        const timer = setTimeout(() => {
            setTrackingTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [phase, trackingTimeLeft]);

    // Send collected frames to backend for scoring
    const sendFramesToBackend = async () => {
        const frames = collectedFramesRef.current;
        setError(null);

        if (frames.length === 0) {
            setError('No pose data captured. Please try again.');
            setPhase(PHASE.RESULTS);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/analyze-frames`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pose_name: currentTargetPose.value,
                    frames: frames,
                    session_id: sessionId,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error: ${res.status}`);
            }

            const data = await res.json();
            setPoseResults(data);
            
            // Mark as completed only if not already in the list
            setCompletedPoses(prev => 
                prev.includes(currentPoseIndex) ? prev : [...prev, currentPoseIndex]
            );
        } catch (err) {
            console.error('Failed to analyze frames:', err);
            setError(err.message || 'Failed to process pose data.');
        }

        setPhase(PHASE.RESULTS);
    };

    // Move to next pose
    const handleNextPose = () => {
        if (currentPoseIndex < poseSequence.length - 1) {
            setCurrentPoseIndex(prev => prev + 1);
            setPoseResults(null);
            setError(null);
            setPhase(PHASE.COUNTDOWN);
            setCountdown(5);
        } else {
            setPhase(PHASE.COMPLETE);
            fetchAnalytics();
        }
    };

    // Fetch session analytics from backend
    const fetchAnalytics = async () => {
        if (!sessionId) return;
        setAnalyticsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/session/${sessionId}/analytics`);
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        }
        setAnalyticsLoading(false);
    };

    // Retry current pose
    const handleRetry = () => {
        setPoseResults(null);
        setError(null);
        // Remove from completed list when retrying
        setCompletedPoses(prev => prev.filter(idx => idx !== currentPoseIndex));
        setPhase(PHASE.COUNTDOWN);
        setCountdown(5);
    };

    // Render loop for pose detection & frame collection
    const renderLoop = useCallback(() => {
        if (!poseLandmarker || !webcamRef.current?.video || !canvasRef.current) {
            animationFrameRef.current = requestAnimationFrame(renderLoop);
            return;
        }

        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Ensure canvas matches video dimensions
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        const currentTime = video.currentTime;
        if (currentTime !== lastVideoTimeRef.current && video.readyState >= 2) {
            lastVideoTimeRef.current = currentTime;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Detect pose
            const results = detectPose(poseLandmarker, video, performance.now());

            // Draw landmarks
            if (results) {
                drawLandmarks(ctx, results, canvas);

                // Collect frame landmarks during tracking phase
                if (results.landmarks && results.landmarks.length > 0) {
                    const userLandmarks = results.landmarks[0];

                    // Store landmarks as plain arrays for serialization
                    const frameData = userLandmarks.map(lm => ({
                        x: lm.x,
                        y: lm.y,
                        z: lm.z,
                        visibility: lm.visibility,
                    }));

                    collectedFramesRef.current.push(frameData);
                    setCollectedFrames([...collectedFramesRef.current]);
                }
            }
        }

        animationFrameRef.current = requestAnimationFrame(renderLoop);
    }, [poseLandmarker]);

    // Start/stop render loop based on phase
    useEffect(() => {
        const shouldTrack = phase === PHASE.TRACKING;

        if (shouldTrack && poseLandmarker) {
            lastVideoTimeRef.current = -1;
            animationFrameRef.current = requestAnimationFrame(renderLoop);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            // Clear landmarks when tracking stops
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [phase, poseLandmarker, renderLoop]);

    // Camera should be on for all phases except loading
    const cameraOn = phase !== PHASE.LOADING;
    const isSetComplete = phase === PHASE.COMPLETE;

    // Get phase display info
    const getPhaseInfo = () => {
        switch (phase) {
            case PHASE.LOADING:
                return { label: 'Loading Model...', color: 'text-gray-500' };
            case PHASE.COUNTDOWN:
                return { label: 'Get Ready!', color: 'text-yellow-600' };
            case PHASE.TRACKING:
                return { label: 'Hold Your Pose!', color: 'text-green-600' };
            case PHASE.PROCESSING:
                return { label: 'Analyzing...', color: 'text-purple-600' };
            case PHASE.RESULTS:
                return { label: 'Results', color: 'text-blue-600' };
            case PHASE.COMPLETE:
                return { label: 'Set Complete!', color: 'text-green-600' };
            default:
                return { label: '', color: '' };
        }
    };

    const phaseInfo = getPhaseInfo();

    // Helper to get score color
    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-500';
    };

    const getScoreBgColor = (score) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getScoreGradient = (score) => {
        if (score >= 80) return 'from-green-400 to-emerald-600';
        if (score >= 50) return 'from-yellow-400 to-amber-600';
        return 'from-red-400 to-rose-600';
    };

    // If set is complete, render the analytics dashboard
    if (isSetComplete) {
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
                    <h1 className="text-xl font-bold text-gray-900">Session Analytics</h1>
                    <div className="w-20" />
                </header>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-4xl mx-auto space-y-6">

                        {/* Loading State */}
                        {analyticsLoading && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                <p className="text-gray-600 font-medium">Loading your session analytics...</p>
                            </div>
                        )}

                        {/* Analytics Dashboard */}
                        {analytics && !analyticsLoading && (
                            <>
                                {/* Congrats Banner */}
                                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Trophy className="w-8 h-8 text-yellow-300" />
                                        <h2 className="text-2xl font-bold">Set Complete!</h2>
                                    </div>
                                    <p className="text-purple-100">You completed {analytics.total_poses} poses in this session. Here's how you did.</p>
                                </div>

                                {/* Overall Score */}
                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg">
                                    <div className="text-gray-600 text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" />
                                        Overall Average Score
                                    </div>
                                    <div className="flex items-end gap-4">
                                        <div className={`text-6xl font-bold ${getScoreColor(analytics.overall_avg_score)}`}>
                                            {analytics.overall_avg_score.toFixed(1)}%
                                        </div>
                                        <div className="text-gray-400 text-sm mb-2">
                                            across {analytics.total_poses} poses
                                        </div>
                                    </div>
                                    {/* Overall score bar */}
                                    <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full bg-gradient-to-r ${getScoreGradient(analytics.overall_avg_score)} transition-all duration-1000 ease-out`}
                                            style={{ width: `${Math.min(analytics.overall_avg_score, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Best & Worst Pose */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {analytics.best_pose && (
                                        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-green-200 shadow-lg">
                                            <div className="flex items-center gap-2 text-green-600 mb-3">
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
                                            <div className="flex items-center gap-2 text-orange-600 mb-3">
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

                                {/* Per-Pose Breakdown */}
                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg">
                                    <h3 className="text-gray-700 font-semibold mb-4">Pose Breakdown</h3>
                                    <div className="space-y-4">
                                        {analytics.poses.map((pose, index) => (
                                            <div key={index} className="bg-white/50 rounded-xl p-4 border border-purple-50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-gray-800">{pose.label}</span>
                                                    <span className={`text-lg font-bold ${getScoreColor(pose.avg_score)}`}>
                                                        {pose.avg_score.toFixed(1)}%
                                                    </span>
                                                </div>
                                                {/* Score bar */}
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
                                </div>

                                {/* Back to Home */}
                                <div className="flex justify-center pt-2 pb-4">
                                    <button
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-10 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                                        onClick={onHomeClick}
                                    >
                                        🎉 Back to Home
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Fallback if no analytics */}
                        {!analytics && !analyticsLoading && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <CheckCircle2 className="w-16 h-16 text-green-500" />
                                <h2 className="text-2xl font-bold text-gray-800">Set Complete!</h2>
                                <p className="text-gray-500">Great job completing all poses.</p>
                                <button
                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg"
                                    onClick={onHomeClick}
                                >
                                    🎉 Back to Home
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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
                <h1 className="text-xl font-bold text-gray-900">Yoga Pose Set</h1>
                <div className="w-20" /> {/* Spacer for centering */}
            </header>

            {/* Pose Sequence Bar */}
            <div className="bg-white/50 backdrop-blur-md px-6 py-4 border-b border-purple-200">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    {poseSequence.map((poseItem, index) => (
                        <React.Fragment key={poseItem.value}>
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${index === currentPoseIndex
                                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                                    : completedPoses.includes(index)
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-white/50 text-gray-500'
                                    }`}
                            >
                                {completedPoses.includes(index) && (
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                )}
                                <span className="font-medium">{poseItem.label}</span>
                            </div>
                            {index < poseSequence.length - 1 && (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-full h-[70vh] max-w-8xl bg-white/40 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/50 flex flex-col lg:flex-row">
                    {/* Camera View */}
                    {/* Split View Container */}
                    <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden bg-white/20">
                        {/* Left: Visual Guidance (Reference Pose) - Only shown when enabled */}
                        {visualGuidanceEnabled && (
                            <div className="flex-1 border-b md:border-b-0 md:border-r border-purple-100 flex items-center justify-center relative p-4 bg-white/30">
                                <img
                                    src={currentTargetPose.image}
                                    alt={`${currentTargetPose.label} reference`}
                                    className="max-h-full max-w-full object-contain"
                                />
                                <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg text-gray-900 text-sm shadow-sm">
                                    Reference: {currentTargetPose.label}
                                </div>
                            </div>
                        )}

                        {/* Right: Camera Feed */}
                        <div className="flex-1 flex items-center justify-center relative">
                            {cameraOn ? (
                                <>
                                    <Webcam
                                        id="video"
                                        className="absolute inset-0 w-full h-full object-cover"
                                        ref={webcamRef}
                                        mirrored={true}
                                        videoConstraints={{
                                            facingMode: "user",
                                            width: 1280,
                                            height: 720
                                        }}
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                        style={{ transform: 'scaleX(-1)' }}
                                    />

                                    {/* Countdown Overlay */}
                                    {phase === PHASE.COUNTDOWN && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                            <div className="bg-black/50 backdrop-blur-sm rounded-full w-40 h-40 flex flex-col items-center justify-center animate-pulse">
                                                <div className="text-white/70 text-sm font-medium mb-1">GET READY</div>
                                                <div className="text-white text-7xl font-bold tabular-nums drop-shadow-lg"
                                                    style={{
                                                        animation: 'countPop 1s ease-in-out infinite',
                                                    }}
                                                >
                                                    {countdown}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tracking Indicator Overlay */}
                                    {phase === PHASE.TRACKING && (
                                        <div className="absolute inset-0 z-10 pointer-events-none">
                                            {/* Pulsing border */}
                                            <div className="absolute inset-0 border-4 border-green-400 rounded-none"
                                                style={{ animation: 'borderPulse 1s ease-in-out infinite' }}
                                            />
                                            {/* Timer pill at top */}
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/90 backdrop-blur-sm rounded-full px-6 py-2 flex items-center gap-2 shadow-lg">
                                                <Activity className="w-5 h-5 text-white animate-pulse" />
                                                <span className="text-white font-bold text-lg tabular-nums">{trackingTimeLeft}s</span>
                                                <span className="text-white/80 text-sm">remaining</span>
                                            </div>
                                            {/* Frame counter */}
                                            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-green-400 text-sm font-mono">
                                                {collectedFrames.length} frames
                                            </div>
                                        </div>
                                    )}

                                    {/* Processing Overlay */}
                                    {phase === PHASE.PROCESSING && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 backdrop-blur-sm">
                                            <div className="bg-white/90 backdrop-blur-md rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-xl">
                                                <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                                                <div className="text-gray-800 font-semibold text-lg">Analyzing your pose...</div>
                                                <div className="text-gray-500 text-sm">{collectedFrames.length} frames captured</div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                                    <p className="text-purple-400 font-medium">Loading pose detection model...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Side Panel */}
                    <div className="w-full lg:w-80 bg-white/60 backdrop-blur-md p-6 flex flex-col border-t lg:border-t-0 lg:border-l border-purple-100">
                        <div className="flex-1 flex flex-col gap-4 mb-6">
                            {/* Target Pose Display */}
                            <div className="bg-purple-600 rounded-xl p-4 shadow-md">
                                <div className="text-purple-100 text-sm mb-1">Target Pose</div>
                                <div className="text-white text-2xl font-bold">{currentTargetPose.label}</div>
                            </div>

                            {/* Phase Status */}
                            <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                <div className="text-gray-600 text-sm mb-1">Status</div>
                                <div className={`text-xl font-bold ${phaseInfo.color}`}>
                                    {phaseInfo.label}
                                </div>
                                {phase === PHASE.TRACKING && (
                                    <div className="mt-2">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                                                style={{ width: `${((5 - trackingTimeLeft) / 5) * 100}%` }}
                                            />
                                        </div>
                                        <div className="text-gray-500 text-xs mt-1">{collectedFrames.length} frames collected</div>
                                    </div>
                                )}
                            </div>

                            {/* Results Display */}
                            {phase === PHASE.RESULTS && poseResults && (
                                <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                    <div className="text-gray-600 text-sm mb-2">Pose Score</div>
                                    <div className={`text-3xl font-bold ${poseResults.avg_score >= 80 ? 'text-green-600' : poseResults.avg_score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                        {poseResults.avg_score?.toFixed(1)}%
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                        <div className="bg-white/60 rounded-lg p-2">
                                            <div className="text-gray-500 text-xs">Max</div>
                                            <div className="font-semibold text-gray-800">{poseResults.max_score?.toFixed(1)}%</div>
                                        </div>
                                        <div className="bg-white/60 rounded-lg p-2">
                                            <div className="text-gray-500 text-xs">Min</div>
                                            <div className="font-semibold text-gray-800">{poseResults.min_score?.toFixed(1)}%</div>
                                        </div>
                                        <div className="bg-white/60 rounded-lg p-2 col-span-2">
                                            <div className="text-gray-500 text-xs">Frames Analyzed</div>
                                            <div className="font-semibold text-gray-800">{poseResults.total_frames}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Display */}
                            {error && (
                                <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                <div className="text-gray-600 text-sm mb-1">Visual Guidance</div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={visualGuidanceEnabled}
                                        onCheckedChange={setVisualGuidanceEnabled}
                                    />
                                    <span className="text-gray-800 text-sm">
                                        {visualGuidanceEnabled ? 'On' : 'Off'}
                                    </span>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                <div className="text-gray-600 text-sm mb-2">Progress</div>
                                <div className="flex gap-2">
                                    {poseSequence.map((_, index) => (
                                        <div
                                            key={index}
                                            className={`flex-1 h-2 rounded-full ${completedPoses.includes(index)
                                                ? 'bg-green-500'
                                                : index === currentPoseIndex
                                                    ? 'bg-purple-500'
                                                    : 'bg-gray-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <div className="text-gray-600 text-sm mt-2">
                                    {completedPoses.length} / {poseSequence.length} poses completed
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-auto">
                            {phase === PHASE.RESULTS && (
                                <>
                                    <button
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition-all duration-200"
                                        onClick={handleRetry}
                                    >
                                        Retry
                                    </button>
                                    <button
                                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                                        onClick={handleNextPose}
                                    >
                                        {currentPoseIndex < poseSequence.length - 1 ? 'Next Pose' : 'Finish'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes countPop {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }
                @keyframes borderPulse {
                    0%, 100% { border-color: rgba(74, 222, 128, 0.8); }
                    50% { border-color: rgba(74, 222, 128, 0.3); }
                }
            `}</style>
        </div>
    );
};

export default SetPage;
